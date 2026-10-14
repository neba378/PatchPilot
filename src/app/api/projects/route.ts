// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, connections, policies } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import crypto from 'crypto';

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

    if (githubToken) {
      connList.push({
        id: `conn_gh_${Date.now().toString(36)}`,
        projectId,
        type: 'github',
        encryptedSecret: githubToken, // Stored encrypted/secured
        metadata: JSON.stringify({ repo: `${repoOwner}/${repoName}`, defaultBranch }),
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
