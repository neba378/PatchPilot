// src/app/api/auth/github/disconnect/route.ts
import { NextResponse } from 'next/server';
import { GITHUB_SESSION_COOKIE_NAME } from '@/core/githubOAuth';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Disconnected from GitHub' });
  response.cookies.delete(GITHUB_SESSION_COOKIE_NAME);
  return response;
}
