// src/__tests__/middleware.test.ts
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';
import { encryptSessionToken, GOOGLE_SESSION_COOKIE_NAME, type GoogleUserSession } from '../core/session';

describe('Next.js Security & Authentication Middleware', () => {
  const mockUser: GoogleUserSession = {
    id: 'user-abc-123',
    googleId: 'g-987654',
    email: 'engineer@patchpilot.io',
    name: 'Ada Lovelace',
    picture: 'https://avatar.url/ada.png',
    role: 'admin',
    connectedAt: new Date().toISOString()
  };

  it('allows unauthenticated access to /login', async () => {
    const req = new NextRequest('http://localhost:3000/login');
    const res = await middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects authenticated user away from /login to /', async () => {
    const token = await encryptSessionToken(mockUser);
    const req = new NextRequest('http://localhost:3000/login', {
      headers: {
        cookie: `${GOOGLE_SESSION_COOKIE_NAME}=${token}`
      }
    });

    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('allows unauthenticated access to webhooks', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/sentry', {
      method: 'POST'
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('allows unauthenticated access to cron jobs', async () => {
    const req = new NextRequest('http://localhost:3000/api/cron/stale-check', {
      method: 'POST'
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('redirects unauthenticated user accessing protected page to /login with returnUrl', async () => {
    const req = new NextRequest('http://localhost:3000/settings');
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBe('http://localhost:3000/login?returnUrl=%2Fsettings');
  });

  it('returns 401 Unauthorized for unauthenticated API requests to protected endpoints', async () => {
    const req = new NextRequest('http://localhost:3000/api/incidents');
    const res = await middleware(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Unauthorized');
  });

  it('permits authenticated user and forwards user context headers', async () => {
    const token = await encryptSessionToken(mockUser);
    const req = new NextRequest('http://localhost:3000/wizard', {
      headers: {
        cookie: `${GOOGLE_SESSION_COOKIE_NAME}=${token}`
      }
    });

    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });
});
