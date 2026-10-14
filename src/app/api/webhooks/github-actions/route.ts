// src/app/api/webhooks/github-actions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logSourceRegistry } from '@/adapters/logsources/registry';
import { correlateAndIngestSignal } from '@/core/correlation';
import { db } from '@/db';
import { jobs } from '@/db/schema';
import { logger } from '@/core/logger';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });

    const adapter = logSourceRegistry.get('github_actions');
    if (!adapter) {
      return NextResponse.json({ error: 'GitHub Actions adapter missing' }, { status: 500 });
    }

    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'github-webhook-secret-token';
    const isValid = adapter.verify({ headers, rawBody }, secret);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
    }

    const queryProj = req.nextUrl.searchParams.get('projectId');
    const dbProjects = await db.select().from(projects);
    const activeProject = (queryProj ? dbProjects.find(p => p.id === queryProj) : null) || dbProjects.find(p => p.repoName === 'test') || dbProjects[0];
    const targetProjectId = activeProject?.id || 'proj_main';

    const payload = JSON.parse(rawBody || '{}');
    const parsedInputs = adapter.parse(payload, targetProjectId);

    for (const input of parsedInputs) {
      const { incident, isNew } = await correlateAndIngestSignal(input);

      if (isNew && incident.status !== 'abstained') {
        await db.insert(jobs).values({
          id: `JOB-${Date.now().toString(36)}`,
          type: 'investigate',
          payload: JSON.stringify({ incidentId: incident.id }),
          status: 'queued',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    return NextResponse.json({ success: true, processed: parsedInputs.length });
  } catch (err: any) {
    logger.error({ error: err.message }, '[Webhook:GHA] Ingest error');
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
