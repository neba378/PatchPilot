// src/app/api/auth/github/repos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  decodeSessionCookie,
  GITHUB_SESSION_COOKIE_NAME,
  fetchGitHubUserRepos,
  GitHubRepoSummary
} from '@/core/githubOAuth';
import { logger } from '@/core/logger';

const MOCK_REPOSITORIES: GitHubRepoSummary[] = [
  {
    id: 101,
    name: 'checkout-api-service',
    fullName: 'nebiyu-org/checkout-api-service',
    owner: 'nebiyu-org',
    defaultBranch: 'main',
    private: true,
    description: 'Core billing and payment checkout microservice with PostgreSQL and Stripe',
    htmlUrl: 'https://github.com/nebiyu-org/checkout-api-service',
    updatedAt: new Date().toISOString()
  },
  {
    id: 102,
    name: 'auth-gateway',
    fullName: 'nebiyu-org/auth-gateway',
    owner: 'nebiyu-org',
    defaultBranch: 'main',
    private: true,
    description: 'OAuth2 and JWT authentication identity gateway',
    htmlUrl: 'https://github.com/nebiyu-org/auth-gateway',
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 103,
    name: 'notification-worker',
    fullName: 'nebiyu-org/notification-worker',
    owner: 'nebiyu-org',
    defaultBranch: 'master',
    private: false,
    description: 'Async notification dispatch queue worker for push, email, and SMS',
    htmlUrl: 'https://github.com/nebiyu-org/notification-worker',
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString()
  }
];

export async function GET(req: NextRequest) {
  try {
    const rawCookie = req.cookies.get(GITHUB_SESSION_COOKIE_NAME)?.value;
    const session = decodeSessionCookie(rawCookie);

    const token = session?.token || (process.env.GITHUB_TOKEN !== 'mock' ? process.env.GITHUB_TOKEN : undefined);

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated with GitHub. Please connect your GitHub account first.' },
        { status: 401 }
      );
    }

    // In dev simulation mode or mock token
    if (session?.source === 'dev_simulation' || token === 'mock' || token.startsWith('gho_mock_')) {
      return NextResponse.json({ repos: MOCK_REPOSITORIES });
    }

    try {
      const repos = await fetchGitHubUserRepos(token);
      return NextResponse.json({ repos });
    } catch (apiErr: any) {
      logger.warn({ error: apiErr.message }, '[GitHub Repos] Failed to fetch live repos, falling back to mock sample if dev');
      // If live token fails due to network/rate limit in dev environment, fall back to mock sample
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({
          repos: MOCK_REPOSITORIES,
          warning: `Live GitHub repo lookup failed: ${apiErr.message}. Showing sample repositories for development.`
        });
      }
      return NextResponse.json({ error: apiErr.message }, { status: 502 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
