// src/app/api/auth/github/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  isGitHubOAuthConfigured,
  getGitHubOAuthAuthorizeUrl,
  getGitHubRedirectUri
} from '@/core/githubOAuth';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const redirectUri = getGitHubRedirectUri(origin);

  if (!isGitHubOAuthConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: 'GitHub OAuth is not configured. Please add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to your environment variables.'
      },
      { status: 400 }
    );
  }

  const state = crypto.randomBytes(20).toString('hex');
  const authorizeUrl = getGitHubOAuthAuthorizeUrl(state, redirectUri);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set('github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600 // 10 minutes
  });

  return response;
}
