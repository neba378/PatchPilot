// src/app/api/auth/google/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  generateOAuthState,
  getGoogleOAuthAuthorizeUrl,
  GOOGLE_STATE_COOKIE_NAME,
  isGoogleOAuthConfigured
} from '@/core/googleOAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      {
        error: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
      },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const returnUrl = searchParams.get('returnUrl') || '/';

  // Generate cryptographic state and signed verification cookie
  const { state, cookieValue } = generateOAuthState(returnUrl);

  const authUrl = getGoogleOAuthAuthorizeUrl(state);

  const response = NextResponse.redirect(authUrl);

  // Set the state cookie (HTTP-only, 10 min expiry)
  response.cookies.set(GOOGLE_STATE_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60 // 10 minutes
  });

  return response;
}
