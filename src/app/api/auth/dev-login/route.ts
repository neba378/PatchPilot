import { NextRequest, NextResponse } from 'next/server';
import { encryptSessionToken, GOOGLE_SESSION_COOKIE_NAME, type GoogleUserSession } from '@/core/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const returnUrl = searchParams.get('returnUrl') || '/';

  const demoUser: GoogleUserSession = {
    id: 'usr_nebiyu_oncall',
    googleId: 'g_nebiyu_dev',
    email: 'nebiyu@patchpilot.io',
    name: 'Nebiyu Musbah',
    picture: '',
    role: 'admin',
    connectedAt: new Date().toISOString()
  };

  const token = await encryptSessionToken(demoUser);

  const response = NextResponse.redirect(new URL(returnUrl, request.url));
  response.cookies.set(GOOGLE_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 // 7 days
  });

  return response;
}
