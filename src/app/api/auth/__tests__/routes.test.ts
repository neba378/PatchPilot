// src/app/api/auth/__tests__/routes.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as loginHandler } from '../google/login/route';
import { GET as logoutHandler } from '../google/logout/route';
import { GET as sessionHandler } from '../session/route';
import { encryptSessionToken, GOOGLE_SESSION_COOKIE_NAME, type GoogleUserSession } from '@/core/session';

describe('Auth API Routes', () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.APP_URL = 'http://localhost:3000';
  });

  describe('GET /api/auth/google/login', () => {
    it('redirects to Google Accounts authorization URL and sets state cookie', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/google/login?returnUrl=/settings');
      const res = await loginHandler(req);

      expect(res.status).toBe(307); // NextResponse.redirect defaults to 307
      const location = res.headers.get('location');
      expect(location).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(location).toContain('client_id=test-client-id.apps.googleusercontent.com');

      const cookies = res.cookies.getAll();
      const stateCookie = cookies.find((c) => c.name === 'pp_google_oauth_state');
      expect(stateCookie).toBeDefined();
      expect(stateCookie?.value).toContain('.');
    });
  });

  describe('GET /api/auth/session', () => {
    it('returns unauthenticated when session cookie is absent', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/session');
      const res = await sessionHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.authenticated).toBe(false);
      expect(json.user).toBeNull();
    });

    it('returns user profile when session cookie is present and valid', async () => {
      const mockSession: GoogleUserSession = {
        id: 'u-1',
        googleId: 'g-1',
        email: 'engineer@patchpilot.io',
        name: 'Lead SRE',
        picture: 'https://avatar.png',
        role: 'admin',
        connectedAt: new Date().toISOString()
      };

      const token = await encryptSessionToken(mockSession);
      const req = new NextRequest('http://localhost:3000/api/auth/session', {
        headers: {
          cookie: `${GOOGLE_SESSION_COOKIE_NAME}=${token}`
        }
      });

      const res = await sessionHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.authenticated).toBe(true);
      expect(json.user.email).toBe(mockSession.email);
      expect(json.user.name).toBe(mockSession.name);
    });
  });

  describe('GET /api/auth/google/logout', () => {
    it('redirects to /login and deletes session cookie', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/google/logout');
      const res = await logoutHandler(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/login');

      // Check cookie deletion
      const cookie = res.cookies.get(GOOGLE_SESSION_COOKIE_NAME);
      expect(cookie?.maxAge).toBe(0);
    });
  });
});
