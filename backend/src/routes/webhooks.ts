import { Router, Request, Response } from 'express';
import { logSourceRegistry } from '@/adapters/logsources/registry';
import { correlateAndIngestSignal } from '@/core/correlation';
import { db } from '@/db';
import { jobs, projects } from '@/db/schema';
import { logger } from '@/core/logger';

export const webhooksRouter = Router();

async function resolveTargetProject(queryProj?: string): Promise<{ id: string; repo?: string }> {
  const dbProjects = await db.select().from(projects);
  const activeProject = (queryProj ? dbProjects.find(p => p.id === queryProj) : null) || dbProjects.find(p => p.repoName === 'test') || dbProjects[0];
  return {
    id: activeProject?.id || 'proj_main',
    repo: activeProject ? `${activeProject.repoOwner}/${activeProject.repoName}` : undefined
  };
}

function getRawBodyAndHeaders(req: Request): { rawBody: string; headers: Record<string, string> } {
  let rawBody = req.rawBody;
  if (!rawBody) {
    if (typeof req.body === 'string') {
      rawBody = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
    } else {
      rawBody = JSON.stringify(req.body || {});
    }
  }

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
    }
  }

  return { rawBody, headers };
}

// POST /api/webhooks/generic
webhooksRouter.post('/generic', async (req: Request, res: Response) => {
  try {
    const { rawBody, headers } = getRawBodyAndHeaders(req);
    const queryProj = req.query.projectId as string | undefined;
    const { id: targetProjectId, repo } = await resolveTargetProject(queryProj);

    const adapter = logSourceRegistry.get('generic_webhook');
    if (!adapter) {
      return res.status(500).json({ error: 'Generic webhook adapter missing' });
    }

    const secret = process.env.GENERIC_WEBHOOK_SECRET || 'generic-webhook-secret-token';
    const isValid = adapter.verify({ headers, rawBody }, secret);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const payload = JSON.parse(rawBody || '{}');
    const parsedInputs = adapter.parse(payload, targetProjectId);

    for (const input of parsedInputs) {
      if (!input.repo && repo) {
        input.repo = repo;
      }
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

    return res.json({ success: true, processed: parsedInputs.length });
  } catch (err: any) {
    logger.error({ error: err.message }, '[Webhook:Generic] Ingest error');
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/webhooks/github-actions
webhooksRouter.post('/github-actions', async (req: Request, res: Response) => {
  try {
    const { rawBody, headers } = getRawBodyAndHeaders(req);
    const queryProj = req.query.projectId as string | undefined;
    const { id: targetProjectId, repo } = await resolveTargetProject(queryProj);

    const adapter = logSourceRegistry.get('github_actions');
    if (!adapter) {
      return res.status(500).json({ error: 'GitHub Actions adapter missing' });
    }

    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'github-webhook-secret-token';
    const isValid = adapter.verify({ headers, rawBody }, secret);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid HMAC signature' });
    }

    const payload = JSON.parse(rawBody || '{}');
    const parsedInputs = adapter.parse(payload, targetProjectId);

    for (const input of parsedInputs) {
      if (!input.repo && repo) {
        input.repo = repo;
      }
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

    return res.json({ success: true, processed: parsedInputs.length });
  } catch (err: any) {
    logger.error({ error: err.message }, '[Webhook:GHA] Ingest error');
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/webhooks/sentry
webhooksRouter.post('/sentry', async (req: Request, res: Response) => {
  try {
    const { rawBody, headers } = getRawBodyAndHeaders(req);
    const queryProj = req.query.projectId as string | undefined;
    const { id: targetProjectId, repo } = await resolveTargetProject(queryProj);

    const adapter = logSourceRegistry.get('sentry');
    if (!adapter) {
      return res.status(500).json({ error: 'Sentry adapter missing' });
    }

    const secret = process.env.SENTRY_WEBHOOK_SECRET || 'sentry-webhook-secret-token';
    const isValid = adapter.verify({ headers, rawBody }, secret);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid HMAC signature' });
    }

    const payload = JSON.parse(rawBody || '{}');
    const parsedInputs = adapter.parse(payload, targetProjectId);

    for (const input of parsedInputs) {
      if (!input.repo && repo) {
        input.repo = repo;
      }
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

    return res.json({ success: true, processed: parsedInputs.length });
  } catch (err: any) {
    logger.error({ error: err.message }, '[Webhook:Sentry] Ingest error');
    return res.status(500).json({ error: err.message });
  }
});
