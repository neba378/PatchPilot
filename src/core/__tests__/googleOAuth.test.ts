// src/core/__tests__/googleOAuth.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateOAuthState,
  verifyOAuthState,
  getGoogleOAuthAuthorizeUrl,
  isGoogleOAuthConfigured,
  upsertGoogleUser
} from '../googleOAuth';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

describe('Google OAuth Core Flow', () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.APP_URL = 'http://localhost:3000';
  });

  it('detects when Google OAuth is configured', () => {
    expect(isGoogleOAuthConfigured()).toBe(true);

    const oldId = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    expect(isGoogleOAuthConfigured()).toBe(false);
    process.env.GOOGLE_CLIENT_ID = oldId;
  });

  it('generates a valid signed OAuth state and verifies it', () => {
    const returnUrl = '/settings';
    const { state, cookieValue } = generateOAuthState(returnUrl);

    expect(state).toBeDefined();
    expect(typeof state).toBe('string');
    expect(cookieValue).toContain('.');

    // Valid state verification
    const verification = verifyOAuthState(state, cookieValue);
    expect(verification.valid).toBe(true);
    expect(verification.returnUrl).toBe(returnUrl);

    // Tampered state nonce
    const invalidVerification = verifyOAuthState('wrong-state', cookieValue);
    expect(invalidVerification.valid).toBe(false);

    // Tampered cookie signature
    const tamperedCookie = cookieValue.slice(0, -6) + '123456';
    const tamperedVerification = verifyOAuthState(state, tamperedCookie);
    expect(tamperedVerification.valid).toBe(false);
  });

  it('builds a proper Google OAuth 2.0 authorization URL', () => {
    const { state } = generateOAuthState('/eval');
    const authUrl = getGoogleOAuthAuthorizeUrl(state);

    const parsed = new URL(authUrl);
    expect(parsed.origin).toBe('https://accounts.google.com');
    expect(parsed.pathname).toBe('/o/oauth2/v2/auth');
    expect(parsed.searchParams.get('client_id')).toBe('test-client-id.apps.googleusercontent.com');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('scope')).toBe('openid email profile');
    expect(parsed.searchParams.get('access_type')).toBe('offline');
    expect(parsed.searchParams.get('state')).toBe(state);
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/auth/google/callback');
  });

  it('upserts a Google user profile into SQLite database', async () => {
    const mockProfile = {
      sub: 'google-test-sub-12345',
      email: 'test-admin@patchpilot.com',
      email_verified: true,
      name: 'DevSecOps Lead',
      picture: 'https://avatar.url/pic.jpg',
      hd: 'patchpilot.com'
    };

    // First login: creates user
    const session = await upsertGoogleUser(mockProfile);
    expect(session.googleId).toBe(mockProfile.sub);
    expect(session.email).toBe(mockProfile.email);
    expect(session.name).toBe(mockProfile.name);
    expect(session.role).toBe('admin');

    // Verify row in database
    const dbUser = db.select().from(users).where(eq(users.googleId, mockProfile.sub)).get();
    expect(dbUser).toBeDefined();
    expect(dbUser?.email).toBe(mockProfile.email);

    // Second login: updates user name without creating duplicate
    const updatedSession = await upsertGoogleUser({
      ...mockProfile,
      name: 'DevSecOps Lead Updated'
    });
    expect(updatedSession.id).toBe(session.id);
    expect(updatedSession.name).toBe('DevSecOps Lead Updated');

    const allMatching = db.select().from(users).where(eq(users.googleId, mockProfile.sub)).all();
    expect(allMatching.length).toBe(1);
  });
});
