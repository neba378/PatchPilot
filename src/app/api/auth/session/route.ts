// src/app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  decryptSessionToken,
  GOOGLE_SESSION_COOKIE_NAME,
  isGoogleOAuthConfigured
} from '@/core/googleOAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(GOOGLE_SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      oauthConfigured: isGoogleOAuthConfigured()
    });
  }

  const session = await decryptSessionToken(sessionCookie);

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      oauthConfigured: isGoogleOAuthConfigured()
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: session,
    oauthConfigured: isGoogleOAuthConfigured()
  });
}
