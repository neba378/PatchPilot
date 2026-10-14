// src/app/api/auth/google/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GOOGLE_SESSION_COOKIE_NAME } from '@/core/session';

export const dynamic = 'force-dynamic';

function handleLogout(request: NextRequest) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const response = NextResponse.redirect(new URL('/login', origin));

  // Expire and clear the cookie immediately
  response.cookies.set(GOOGLE_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });

  return response;
}

export async function GET(request: NextRequest) {
  return handleLogout(request);
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}
