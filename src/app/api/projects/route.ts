import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, connections, policies } from '@/db/schema';
import { desc, eq, and, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import { decodeSessionCookie, GITHUB_SESSION_COOKIE_NAME } from '@/core/githubOAuth';

export async function GET() {
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

    return NextResponse.json({ projects: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      repoOwner,
      repoName,
      defaultBranch = 'main',
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
      return NextResponse.json(
        { error: 'Project name, repository owner, and repository name are required.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Check if project already exists
    const existingProject = body.projectId
      ? await db.select().from(projects).where(eq(projects.id, body.projectId)).get()
      : await db.select().from(projects).where(and(eq(projects.repoOwner, repoOwner), eq(projects.repoName, repoName))).get();

    const projectId = existingProject ? existingProject.id : `proj_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;

    if (existingProject) {
      await db.update(projects).set({
        name,
        defaultBranch,
        updatedAt: now
      }).where(eq(projects.id, projectId));
    } else {
      // 1. Create Project
      await db.insert(projects).values({
        id: projectId,
        name,
        repoOwner,
        repoName,
        defaultBranch,
        sandboxProvider: 'local-docker',
        createdAt: now,
        updatedAt: now
      });

      // 2. Initialize Policy
      await db.insert(policies).values({
        id: `POL-${projectId}`,
        projectId,
        autonomyLevel: 'draft_pr',
        protectedPaths: '["migrations/**", "infra/**", ".github/**", "security/**", ".env"]',
        maxChangedFiles: 3,
        maxChangedLines: 60,
        modelCallBudget: 10,
        sandboxTimeoutSeconds: 180,
        maxRetries: 2,
        circuitBreakerTripped: false
      });
    }

    // 3. Save Connections (encrypted secrets)
    const connList: any[] = [];

    const rawSessionCookie = req.cookies.get(GITHUB_SESSION_COOKIE_NAME)?.value;
    const session = decodeSessionCookie(rawSessionCookie);
    const effectiveGithubToken = githubToken || session?.token || (process.env.GITHUB_TOKEN !== 'mock' ? process.env.GITHUB_TOKEN : undefined);

    if (effectiveGithubToken) {
      if (existingProject) {
        await db.delete(connections).where(and(eq(connections.projectId, projectId), eq(connections.type, 'github')));
      }
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

    const effectiveAiKey = aiApiKey || geminiApiKey || (existingProject ? undefined : process.env.GEMINI_API_KEY);
    if (effectiveAiKey || aiModel) {
      const chosenProvider = aiProvider || 'gemini';
      if (existingProject) {
        await db.delete(connections).where(
          and(eq(connections.projectId, projectId), inArray(connections.type, ['gemini', 'openai', 'anthropic', 'gateway', 'ai']))
        );
      }
      connList.push({
        id: `conn_${chosenProvider}_${Date.now().toString(36)}`,
        projectId,
        type: chosenProvider,
        encryptedSecret: effectiveAiKey || 'configured_in_env',
        metadata: JSON.stringify({
          provider: chosenProvider,
          model: aiModel || (chosenProvider === 'openai' ? 'gpt-4o-mini' : chosenProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gemini-2.5-flash')
        }),
        createdAt: now
      });
    }

    if (sentrySecret || sentryOrg) {
      if (existingProject) {
        await db.delete(connections).where(and(eq(connections.projectId, projectId), eq(connections.type, 'sentry')));
      }
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
      if (existingProject) {
        await db.delete(connections).where(and(eq(connections.projectId, projectId), eq(connections.type, 'telegram')));
      }
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

    return NextResponse.json({
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, aiProvider, aiModel, aiApiKey } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (aiProvider || aiModel || aiApiKey) {
      const chosenProvider = aiProvider || 'gemini';
      const existingConns = await db.select().from(connections).where(eq(connections.projectId, projectId));
      const existingAiConn = existingConns.find(c => ['gemini', 'openai', 'anthropic', 'gateway', 'ai'].includes(c.type));

      const effectiveKey = aiApiKey || existingAiConn?.encryptedSecret || process.env.GEMINI_API_KEY || 'configured_in_env';

      await db.delete(connections).where(
        and(eq(connections.projectId, projectId), inArray(connections.type, ['gemini', 'openai', 'anthropic', 'gateway', 'ai']))
      );

      await db.insert(connections).values({
        id: `conn_${chosenProvider}_${Date.now().toString(36)}`,
        projectId,
        type: chosenProvider,
        encryptedSecret: effectiveKey,
        metadata: JSON.stringify({
          provider: chosenProvider,
          model: aiModel || (chosenProvider === 'openai' ? 'gpt-4o-mini' : chosenProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gemini-2.5-flash')
        }),
        createdAt: now
      });
    }

    await db.update(projects).set({ updatedAt: now }).where(eq(projects.id, projectId));

    return NextResponse.json({
      success: true,
      message: 'AI model configuration updated successfully.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

