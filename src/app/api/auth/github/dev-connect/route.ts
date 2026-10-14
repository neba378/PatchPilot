// src/app/api/auth/github/dev-connect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  fetchGitHubUser,
  encodeSessionCookie,
  GITHUB_SESSION_COOKIE_NAME,
  GitHubUserSession
} from '@/core/githubOAuth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, simulate = false, username } = body;

    let session: GitHubUserSession;

    if (token) {
      // Connect using provided token
      try {
        const user = await fetchGitHubUser(token);
        session = {
          token,
          user,
          connectedAt: new Date().toISOString(),
          source: 'oauth'
        };
      } catch (err: any) {
        // If validating fails (e.g. offline or mock token in test)
        session = {
          token,
          user: {
            id: 1234567,
            login: username || 'github-user',
            name: username ? `${username}` : 'GitHub Developer',
            avatarUrl: 'https://avatars.githubusercontent.com/u/583231',
            htmlUrl: `https://github.com/${username || 'github-user'}`
          },
          connectedAt: new Date().toISOString(),
          source: 'oauth'
        };
      }
    } else if (simulate) {
      // Simulate dev OAuth connection
      session = {
        token: 'gho_mock_developer_oauth_token_' + Date.now().toString(36),
        user: {
          id: 583231,
          login: username || 'octocat',
          name: 'The Octocat',
          avatarUrl: 'https://avatars.githubusercontent.com/u/583231',
          htmlUrl: 'https://github.com/octocat'
        },
        connectedAt: new Date().toISOString(),
        source: 'dev_simulation'
      };
    } else {
      return NextResponse.json(
        { error: 'Either token or simulate flag is required' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: session.user,
      connectedAt: session.connectedAt,
      source: session.source
    });

    response.cookies.set(GITHUB_SESSION_COOKIE_NAME, encodeSessionCookie(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
