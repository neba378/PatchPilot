// backend/src/routes/projects.ts
import { Router, Request, Response } from 'express';
import { db } from '@/db';
import {
  projects,
  connections,
  policies,
  signals,
  incidents,
  investigations,
  fixAttempts,
  pullRequests,
  postmortems,
  messages,
  chatLinks,
  memories
} from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { decodeSessionCookie, GITHUB_SESSION_COOKIE_NAME } from '@/core/githubOAuth';
import { sandboxRegistry } from '@/adapters/sandboxes/registry';
import { logger } from '@/core/logger';

export const projectsRouter = Router();

projectsRouter.get('/sandboxes', async (_req: Request, res: Response) => {
  return res.json({ sandboxes: sandboxRegistry.list() });
});

projectsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));
    const allConnections = await db.select().from(connections);

    const enriched = allProjects.map(p => ({
      ...p,
      connections: allConnections.filter(c => c.projectId === p.id).map(c => ({
        id: c.id,
        type: c.type,
        metadata: JSON.parse(c.metadata || '{}'),
        createdAt: c.createdAt
      }))
    }));

    return res.json({ projects: enriched });
  } catch (err: any) {
    logger.error({ error: err.message }, '[Projects] List failed');
    return res.status(500).json({ error: err.message });
  }
});

projectsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const {
      name,
      repoOwner,
      repoName,
      defaultBranch = 'main',
      sandboxProvider = 'local-docker',
      githubToken,
      aiProvider = 'gemini',
      aiModel,
      aiApiKey,
      geminiApiKey,
      sentrySecret,
      sentryOrg,
      sentryProject,
      telegramToken,
      telegramChatId
    } = body;

    if (!name || !repoOwner || !repoName) {
      return res.status(400).json({
        error: 'Project name, repository owner, and repository name are required.'
      });
    }

    const allowedSandboxes = ['local-docker', 'e2b', 'modal', 'fake'];
    const chosenSandbox = allowedSandboxes.includes(sandboxProvider) ? sandboxProvider : 'local-docker';

    const projectId = `proj_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    // 1. Create Project
    await db.insert(projects).values({
      id: projectId,
      name,
      repoOwner,
      repoName,
      defaultBranch,
      sandboxProvider: chosenSandbox,
      createdAt: now,
      updatedAt: now
    });

    // 2. Initialize Policy
    const autonomyLevel = body.canDraftPR === false ? 'suggest' : (body.autonomyLevel || 'draft_pr');
    await db.insert(policies).values({
      id: `POL-${projectId}`,
      projectId,
      autonomyLevel,
      protectedPaths: '["migrations/**", "infra/**", ".github/**", "security/**", ".env"]',
      maxChangedFiles: 3,
      maxChangedLines: 60,
      modelCallBudget: 10,
      sandboxTimeoutSeconds: 180,
      maxRetries: 2,
      circuitBreakerTripped: false
    });

    // 3. Save Connections
    const connList: any[] = [];
    const rawSessionCookie = req.cookies?.[GITHUB_SESSION_COOKIE_NAME];
    const session = decodeSessionCookie(rawSessionCookie);
    const effectiveGithubToken = githubToken || session?.token || (process.env.GITHUB_TOKEN !== 'mock' ? process.env.GITHUB_TOKEN : undefined);

    if (effectiveGithubToken) {
      connList.push({
        id: `conn_gh_${Date.now().toString(36)}`,
        projectId,
        type: 'github',
        encryptedSecret: effectiveGithubToken,
        metadata: JSON.stringify({
          repo: `${repoOwner}/${repoName}`,
          defaultBranch,
          connectedVia: session ? session.source : (githubToken ? 'token' : 'env'),
          username: session?.user?.login || repoOwner
        }),
        createdAt: now
      });
    }

    const effectiveAiKey = aiApiKey || geminiApiKey;
    if (effectiveAiKey) {
      const chosenProvider = aiProvider || 'gemini';
      connList.push({
        id: `conn_${chosenProvider}_${Date.now().toString(36)}`,
        projectId,
        type: chosenProvider,
        encryptedSecret: effectiveAiKey,
        metadata: JSON.stringify({
          provider: chosenProvider,
          model: aiModel || (chosenProvider === 'openai' ? 'gpt-4o-mini' : chosenProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gemini-flash-latest')
        }),
        createdAt: now
      });
    }

    if (sentrySecret || sentryOrg) {
      connList.push({
        id: `conn_sentry_${Date.now().toString(36)}`,
        projectId,
        type: 'sentry',
        encryptedSecret: sentrySecret || 'default_secret',
        metadata: JSON.stringify({ org: sentryOrg, project: sentryProject }),
        createdAt: now
      });
    }

    if (telegramToken) {
      connList.push({
        id: `conn_tg_${Date.now().toString(36)}`,
        projectId,
        type: 'telegram',
        encryptedSecret: telegramToken,
        metadata: JSON.stringify({ chatId: telegramChatId }),
        createdAt: now
      });
    }

    for (const conn of connList) {
      await db.insert(connections).values(conn);
    }

    return res.json({
      success: true,
      projectId,
      project: { id: projectId, name, repo: `${repoOwner}/${repoName}` },
      webhookUrls: {
        sentry: `/api/webhooks/sentry?projectId=${projectId}`,
        githubActions: `/api/webhooks/github-actions?projectId=${projectId}`,
        generic: `/api/webhooks/generic?projectId=${projectId}`
      }
    });
  } catch (err: any) {
    logger.error({ error: err.message }, '[Projects] Create failed');
    return res.status(500).json({ error: err.message });
  }
});

projectsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { sandboxProvider, name, defaultBranch } = req.body || {};

    const project = await db.select().from(projects).where(eq(projects.id, id)).get();
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updates: Partial<typeof projects.$inferInsert> = {
      updatedAt: new Date().toISOString()
    };

    if (sandboxProvider !== undefined) {
      const allowed = ['local-docker', 'e2b', 'modal', 'fake'];
      if (!allowed.includes(sandboxProvider)) {
        return res.status(400).json({ error: `Invalid sandbox provider. Must be one of: ${allowed.join(', ')}` });
      }
      updates.sandboxProvider = sandboxProvider;
    }

    if (name) updates.name = name;
    if (defaultBranch) updates.defaultBranch = defaultBranch;

    await db.update(projects).set(updates).where(eq(projects.id, id));

    const updated = await db.select().from(projects).where(eq(projects.id, id)).get();
    logger.info({ projectId: id, sandboxProvider: updated?.sandboxProvider }, '[Projects] Project updated successfully');
    return res.json({ success: true, project: updated });
  } catch (err: any) {
    logger.error({ error: err.message }, '[Projects] Update failed');
    return res.status(500).json({ error: err.message });
  }
});

projectsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const project = await db.select().from(projects).where(eq(projects.id, id)).get();
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Find all incident IDs for this project
    const projectIncidents = await db.select({ id: incidents.id }).from(incidents).where(eq(incidents.projectId, id));
    const incidentIds = projectIncidents.map(i => i.id);

    for (const incId of incidentIds) {
      await db.delete(investigations).where(eq(investigations.incidentId, incId));
      await db.delete(fixAttempts).where(eq(fixAttempts.incidentId, incId));
      await db.delete(pullRequests).where(eq(pullRequests.incidentId, incId));
      await db.delete(postmortems).where(eq(postmortems.incidentId, incId));
      await db.delete(messages).where(eq(messages.incidentId, incId));
    }

    // Delete incidents
    await db.delete(incidents).where(eq(incidents.projectId, id));

    // Delete project-level child records
    await db.delete(connections).where(eq(connections.projectId, id));
    await db.delete(policies).where(eq(policies.projectId, id));
    await db.delete(signals).where(eq(signals.projectId, id));
    await db.delete(chatLinks).where(eq(chatLinks.projectId, id));
    await db.delete(memories).where(eq(memories.projectId, id));

    // Delete project itself
    await db.delete(projects).where(eq(projects.id, id));

    logger.info({ projectId: id, name: project.name }, '[Projects] Project deleted successfully');
    return res.json({ success: true, message: `Project ${project.name} deleted successfully` });
  } catch (err: any) {
    logger.error({ error: err.message }, '[Projects] Delete failed');
    return res.status(500).json({ error: err.message });
  }
});
