import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, connections, policies } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
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

    const projectId = `proj_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

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

    // 3. Save Connections (encrypted secrets)
    const connList: any[] = [];

    const rawSessionCookie = req.cookies.get(GITHUB_SESSION_COOKIE_NAME)?.value;
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

    if (geminiApiKey) {
      connList.push({
        id: `conn_gemini_${Date.now().toString(36)}`,
        projectId,
        type: 'gemini',
        encryptedSecret: geminiApiKey,
        metadata: JSON.stringify({ model: 'gemini-2.5-flash' }),
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
