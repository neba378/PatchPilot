// src/app/api/auth/google/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  verifyOAuthState,
  exchangeGoogleCodeForToken,
  fetchGoogleUserInfo,
  upsertGoogleUser,
  encryptSessionToken,
  GOOGLE_SESSION_COOKIE_NAME,
  GOOGLE_STATE_COOKIE_NAME,
  getGoogleOAuthRedirectUri
} from '@/core/googleOAuth';
import { logger } from '@/core/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const origin = `${url.protocol}//${url.host}`;
  const loginUrl = new URL('/login', origin);

  if (error) {
    logger.warn({ error }, 'Google OAuth returned error query param');
    loginUrl.searchParams.set('error', error);
    return NextResponse.redirect(loginUrl);
  }

  if (!code || !state) {
    logger.warn('Google OAuth callback missing code or state');
    loginUrl.searchParams.set('error', 'missing_code_or_state');
    return NextResponse.redirect(loginUrl);
  }

  // Verify state cookie
  const stateCookie = request.cookies.get(GOOGLE_STATE_COOKIE_NAME)?.value || '';
  const { valid, returnUrl } = verifyOAuthState(state, stateCookie);

  if (!valid) {
    logger.warn({ state }, 'Invalid or expired OAuth state');
    loginUrl.searchParams.set('error', 'invalid_state');
    return NextResponse.redirect(loginUrl);
  }

  try {
    // 1. Exchange code for access token
    const tokenData = await exchangeGoogleCodeForToken(code, getGoogleOAuthRedirectUri(origin));

    // 2. Fetch user profile from Google UserInfo endpoint
    const userInfo = await fetchGoogleUserInfo(tokenData.access_token);

    // 3. Upsert user in database
    const userSession = await upsertGoogleUser(userInfo);

    // 4. Encrypt session token
    const sessionToken = await encryptSessionToken(userSession);

    // 5. Build redirect response
    const destination = returnUrl.startsWith('/') ? `${origin}${returnUrl}` : origin;
    const response = NextResponse.redirect(destination);

    // Set secure HTTP-only session cookie (valid for 7 days)
    response.cookies.set(GOOGLE_SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    // Clear state cookie
    response.cookies.delete(GOOGLE_STATE_COOKIE_NAME);

    logger.info({ email: userSession.email }, 'Google OAuth login successful');
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message }, 'Google OAuth authentication failed');
    loginUrl.searchParams.set('error', 'auth_failed');
    return NextResponse.redirect(loginUrl);
  }
}
