// src/app/api/webhooks/sentry/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logSourceRegistry } from '@/adapters/logsources/registry';
import { correlateAndIngestSignal } from '@/core/correlation';
import { db } from '@/db';
import { jobs, projects } from '@/db/schema';
import { logger } from '@/core/logger';
import { executeInvestigationForIncident } from '@/core/investigationRunner';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });

    const adapter = logSourceRegistry.get('sentry');
    if (!adapter) {
      return NextResponse.json({ error: 'Sentry adapter missing' }, { status: 500 });
    }

    const isSimulation =
      headers['x-test-simulation'] === 'true' ||
      headers['x-simulation'] === 'true' ||
      req.nextUrl.searchParams.get('simulation') === 'true';

    if (!isSimulation) {
      const secret = process.env.SENTRY_WEBHOOK_SECRET || 'sentry-webhook-secret-token';
      const isValid = adapter.verify({ headers, rawBody }, secret);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody || '{}');
    const queryProj = req.nextUrl.searchParams.get('projectId') || payload.projectId;
    const dbProjects = await db.select().from(projects);
    const activeProject = (queryProj ? dbProjects.find(p => p.id === queryProj) : null) || dbProjects.find(p => p.repoName === 'test') || dbProjects[0];
    const targetProjectId = activeProject?.id || 'proj_main';

    const parsedInputs = adapter.parse(payload, targetProjectId);
    const results = [];

    for (const input of parsedInputs) {
      if (!input.repo && activeProject) {
        input.repo = `${activeProject.repoOwner}/${activeProject.repoName}`;
      }
      const { incident, isNew } = await correlateAndIngestSignal(input);
      results.push({ id: incident.id, status: incident.status, isNew });

      if (incident.status !== 'abstained') {
        const jobId = `JOB-${Date.now().toString(36)}`;
        await db.insert(jobs).values({
          id: jobId,
          type: 'investigate',
          payload: JSON.stringify({ incidentId: incident.id }),
          status: 'queued',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // Trigger immediate autonomous investigation in background
        executeInvestigationForIncident(incident.id, jobId).catch((err: any) => {
          logger.error({ error: err.message, incidentId: incident.id }, '[Webhook:Sentry] Async investigation error');
        });
      }
    }

    return NextResponse.json({ success: true, processed: parsedInputs.length, incidents: results });
  } catch (err: any) {
    logger.error({ error: err.message }, '[Webhook:Sentry] Ingest error');
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
