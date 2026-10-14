// src/app/api/auth/github/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  decodeSessionCookie,
  GITHUB_SESSION_COOKIE_NAME,
  isGitHubOAuthConfigured
} from '@/core/githubOAuth';

export async function GET(req: NextRequest) {
  const configured = isGitHubOAuthConfigured();
  const rawCookie = req.cookies.get(GITHUB_SESSION_COOKIE_NAME)?.value;
  const session = decodeSessionCookie(rawCookie);

  if (session && session.token && session.user) {
    return NextResponse.json({
      configured,
      connected: true,
      user: session.user,
      connectedAt: session.connectedAt,
      source: session.source
    });
  }

  // If no OAuth session cookie, but GITHUB_TOKEN environment variable is present,
  // report status so UI can indicate system-level token availability if relevant
  return NextResponse.json({
    configured,
    connected: false,
    user: null,
    hasEnvToken: Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== 'mock')
  });
}
