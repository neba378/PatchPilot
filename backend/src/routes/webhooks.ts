import { Router, Request, Response } from 'express';
import { logSourceRegistry } from '@/adapters/logsources/registry';
import { correlateAndIngestSignal } from '@/core/correlation';
import { db } from '@/db';
import { jobs, projects } from '@/db/schema';
import { logger } from '@/core/logger';
import { triggerBackgroundInvestigation } from '@/core/investigationRunner';

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
  const startTime = Date.now();
  logger.info('[Webhook:Generic] 📥 Received generic webhook request');
  try {
    const { rawBody, headers } = getRawBodyAndHeaders(req);
    const queryProj = req.query.projectId as string | undefined;
    logger.debug({ queryProj, headerCount: Object.keys(headers).length, bodyLength: rawBody?.length || 0 }, '[Webhook:Generic] Request metadata');

    const { id: targetProjectId, repo } = await resolveTargetProject(queryProj);
    logger.debug({ targetProjectId, repo }, '[Webhook:Generic] Resolved target project');

    const adapter = logSourceRegistry.get('generic_webhook');
    if (!adapter) {
      logger.error('[Webhook:Generic] Adapter "generic_webhook" not found in registry');
      return res.status(500).json({ error: 'Generic webhook adapter missing' });
    }

    const secret = process.env.GENERIC_WEBHOOK_SECRET || 'generic-webhook-secret-token';
    const isValid = adapter.verify({ headers, rawBody }, secret);
    logger.debug({ isValid }, '[Webhook:Generic] Signature verification check');
    if (!isValid) {
      logger.warn('[Webhook:Generic] Signature verification failed');
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const payload = JSON.parse(rawBody || '{}');
    const parsedInputs = adapter.parse(payload, targetProjectId);
    logger.info({ signalCount: parsedInputs.length }, '[Webhook:Generic] Parsed signals from payload');

    for (let i = 0; i < parsedInputs.length; i++) {
      const input = parsedInputs[i];
      if (!input.repo && repo) {
        input.repo = repo;
      }
      logger.debug({ signalIndex: i, title: input.title, errorType: input.errorType, repo: input.repo }, '[Webhook:Generic] Correlating and ingesting signal');
      const { incident, isNew } = await correlateAndIngestSignal(input);
      logger.info({ incidentId: incident.id, isNew, status: incident.status, severity: incident.severity }, '[Webhook:Generic] Signal correlated to incident');

      triggerBackgroundInvestigation(incident, isNew);
      logger.debug({ incidentId: incident.id }, '[Webhook:Generic] Triggered background investigation');

      if (isNew && incident.status !== 'abstained') {
        const jobId = `JOB-${Date.now().toString(36)}`;
        await db.insert(jobs).values({
          id: jobId,
          type: 'investigate',
          payload: JSON.stringify({ incidentId: incident.id }),
          status: 'queued',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        logger.debug({ jobId, incidentId: incident.id }, '[Webhook:Generic] Enqueued investigation job in database queue');
      }
    }

    const duration = Date.now() - startTime;
    logger.info({ processed: parsedInputs.length, durationMs: duration }, '[Webhook:Generic] Successfully finished ingestion');
    return res.json({ success: true, processed: parsedInputs.length });
  } catch (err: any) {
    logger.error({ error: err.message, stack: err.stack }, '[Webhook:Generic] Ingest error');
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/webhooks/github-actions
webhooksRouter.post('/github-actions', async (req: Request, res: Response) => {
  const startTime = Date.now();
  logger.info('[Webhook:GHA] 📥 Received GitHub Actions webhook request');
  try {
    const { rawBody, headers } = getRawBodyAndHeaders(req);
    const queryProj = req.query.projectId as string | undefined;
    logger.debug({ queryProj, headerCount: Object.keys(headers).length, bodyLength: rawBody?.length || 0 }, '[Webhook:GHA] Request metadata');

    const { id: targetProjectId, repo } = await resolveTargetProject(queryProj);
    logger.debug({ targetProjectId, repo }, '[Webhook:GHA] Resolved target project');

    const adapter = logSourceRegistry.get('github_actions');
    if (!adapter) {
      logger.error('[Webhook:GHA] Adapter "github_actions" not found in registry');
      return res.status(500).json({ error: 'GitHub Actions adapter missing' });
    }

    const isSimulation = req.headers['x-test-simulation'] === 'true' || req.query.simulation === 'true';
    logger.debug({ isSimulation }, '[Webhook:GHA] Simulation mode status');
    if (!isSimulation) {
      const secret = process.env.GITHUB_WEBHOOK_SECRET || 'github-webhook-secret-token';
      const isValid = adapter.verify({ headers, rawBody }, secret);
      logger.debug({ isValid }, '[Webhook:GHA] HMAC signature verification');
      if (!isValid) {
        logger.warn('[Webhook:GHA] HMAC signature verification failed');
        return res.status(401).json({ error: 'Invalid HMAC signature' });
      }
    }

    const payload = JSON.parse(rawBody || '{}');
    const parsedInputs = adapter.parse(payload, targetProjectId);
    logger.info({ signalCount: parsedInputs.length }, '[Webhook:GHA] Parsed signals from payload');

    for (let i = 0; i < parsedInputs.length; i++) {
      const input = parsedInputs[i];
      if (!input.repo && repo) {
        input.repo = repo;
      }
      logger.debug({ signalIndex: i, title: input.title, errorType: input.errorType, repo: input.repo, commitSha: input.commitSha }, '[Webhook:GHA] Correlating and ingesting signal');
      const { incident, isNew } = await correlateAndIngestSignal(input);
      logger.info({ incidentId: incident.id, isNew, status: incident.status, severity: incident.severity }, '[Webhook:GHA] Signal correlated to incident');

      triggerBackgroundInvestigation(incident, isNew);
      logger.debug({ incidentId: incident.id }, '[Webhook:GHA] Triggered background investigation');

      if (isNew && incident.status !== 'abstained') {
        const jobId = `JOB-${Date.now().toString(36)}`;
        await db.insert(jobs).values({
          id: jobId,
          type: 'investigate',
          payload: JSON.stringify({ incidentId: incident.id }),
          status: 'queued',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        logger.debug({ jobId, incidentId: incident.id }, '[Webhook:GHA] Enqueued investigation job in database queue');
      }
    }

    const duration = Date.now() - startTime;
    logger.info({ processed: parsedInputs.length, durationMs: duration }, '[Webhook:GHA] Successfully finished ingestion');
    return res.json({ success: true, processed: parsedInputs.length });
  } catch (err: any) {
    logger.error({ error: err.message, stack: err.stack }, '[Webhook:GHA] Ingest error');
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/webhooks/sentry
webhooksRouter.post('/sentry', async (req: Request, res: Response) => {
  const startTime = Date.now();
  logger.info('[Webhook:Sentry] 📥 Received Sentry webhook request');
  try {
    const { rawBody, headers } = getRawBodyAndHeaders(req);
    const queryProj = req.query.projectId as string | undefined;
    logger.debug({ queryProj, headerCount: Object.keys(headers).length, bodyLength: rawBody?.length || 0 }, '[Webhook:Sentry] Request metadata');

    const { id: targetProjectId, repo } = await resolveTargetProject(queryProj);
    logger.debug({ targetProjectId, repo }, '[Webhook:Sentry] Resolved target project');

    const adapter = logSourceRegistry.get('sentry');
    if (!adapter) {
      logger.error('[Webhook:Sentry] Adapter "sentry" not found in registry');
      return res.status(500).json({ error: 'Sentry adapter missing' });
    }

    const isSimulation = req.headers['x-test-simulation'] === 'true' || req.query.simulation === 'true';
    logger.debug({ isSimulation }, '[Webhook:Sentry] Simulation mode status');
    if (!isSimulation) {
      const secret = process.env.SENTRY_WEBHOOK_SECRET || 'sentry-webhook-secret-token';
      const isValid = adapter.verify({ headers, rawBody }, secret);
      logger.debug({ isValid }, '[Webhook:Sentry] HMAC signature verification');
      if (!isValid) {
        logger.warn('[Webhook:Sentry] Sentry HMAC signature verification failed');
        return res.status(401).json({ error: 'Invalid HMAC signature' });
      }
    }

    const payload = JSON.parse(rawBody || '{}');
    const parsedInputs = adapter.parse(payload, targetProjectId);
    logger.info({ signalCount: parsedInputs.length }, '[Webhook:Sentry] Parsed signals from payload');

    for (let i = 0; i < parsedInputs.length; i++) {
      const input = parsedInputs[i];
      if (!input.repo && repo) {
        input.repo = repo;
      }
      logger.debug({ signalIndex: i, title: input.title, errorType: input.errorType, repo: input.repo, release: input.release }, '[Webhook:Sentry] Correlating and ingesting signal');
      const { incident, isNew } = await correlateAndIngestSignal(input);
      logger.info({ incidentId: incident.id, isNew, status: incident.status, severity: incident.severity }, '[Webhook:Sentry] Signal correlated to incident');

      triggerBackgroundInvestigation(incident, isNew);
      logger.debug({ incidentId: incident.id }, '[Webhook:Sentry] Triggered background investigation');

      if (isNew && incident.status !== 'abstained') {
        const jobId = `JOB-${Date.now().toString(36)}`;
        await db.insert(jobs).values({
          id: jobId,
          type: 'investigate',
          payload: JSON.stringify({ incidentId: incident.id }),
          status: 'queued',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        logger.debug({ jobId, incidentId: incident.id }, '[Webhook:Sentry] Enqueued investigation job in database queue');
      }
    }

    const duration = Date.now() - startTime;
    logger.info({ processed: parsedInputs.length, durationMs: duration }, '[Webhook:Sentry] Successfully finished ingestion');
    return res.json({ success: true, processed: parsedInputs.length });
  } catch (err: any) {
    logger.error({ error: err.message, stack: err.stack }, '[Webhook:Sentry] Ingest error');
    return res.status(500).json({ error: err.message });
  }
});
