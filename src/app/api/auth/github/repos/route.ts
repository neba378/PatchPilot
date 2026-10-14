// src/app/api/auth/github/repos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  decodeSessionCookie,
  GITHUB_SESSION_COOKIE_NAME,
  fetchGitHubUserRepos
} from '@/core/githubOAuth';
import { logger } from '@/core/logger';

export async function GET(req: NextRequest) {
  try {
    const rawCookie = req.cookies.get(GITHUB_SESSION_COOKIE_NAME)?.value;
    const session = decodeSessionCookie(rawCookie);

    const token = session?.token || (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== 'mock' ? process.env.GITHUB_TOKEN : undefined);

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated with GitHub. Please connect your GitHub account.' },
        { status: 401 }
      );
    }

    const repos = await fetchGitHubUserRepos(token);
    return NextResponse.json({ repos });
  } catch (err: any) {
    logger.error({ error: err.message }, '[GitHub Repos] Error fetching user repositories');
    return NextResponse.json({ error: err.message || 'Failed to fetch repositories from GitHub.' }, { status: 500 });
  }
}
