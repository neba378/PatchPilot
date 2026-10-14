// src/core/googleOAuth.ts
import crypto from 'crypto';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from './logger';
import {
  GoogleUserSession,
  GOOGLE_SESSION_COOKIE_NAME,
  GOOGLE_STATE_COOKIE_NAME,
  encryptSessionToken,
  decryptSessionToken
} from './session';

export {
  type GoogleUserSession,
  GOOGLE_SESSION_COOKIE_NAME,
  GOOGLE_STATE_COOKIE_NAME,
  encryptSessionToken,
  decryptSessionToken
};

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  id_token?: string;
  scope: string;
  token_type: string;
  refresh_token?: string;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  hd?: string; // Hosted Google Workspace domain
}

function getHmacKey(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }
  return crypto.createHash('sha256').update(rawKey).digest();
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleOAuthRedirectUri(reqOrigin?: string): string {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  const baseUrl = reqOrigin || process.env.APP_URL || 'http://localhost:3000';
  return `${baseUrl.replace(/\/$/, '')}/api/auth/google/callback`;
}

export function generateOAuthState(returnUrl: string = '/'): { state: string; cookieValue: string } {
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = JSON.stringify({ nonce, returnUrl, timestamp: Date.now() });
  const key = getHmacKey();
  const signature = crypto.createHmac('sha256', key).update(payload).digest('base64url');
  
  const encodedPayload = Buffer.from(payload).toString('base64url');
  const cookieValue = `${encodedPayload}.${signature}`;
  return { state: nonce, cookieValue };
}

export function verifyOAuthState(state: string, cookieValue: string): { valid: boolean; returnUrl: string } {
  if (!cookieValue || !state) {
    return { valid: false, returnUrl: '/' };
  }
  const parts = cookieValue.split('.');
  if (parts.length !== 2) {
    return { valid: false, returnUrl: '/' };
  }
  const [encodedPayload, signature] = parts;
  const key = getHmacKey();
  const rawPayload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
  const expectedSig = crypto.createHmac('sha256', key).update(rawPayload).digest('base64url');
  
  if (signature.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return { valid: false, returnUrl: '/' };
  }

  try {
    const data = JSON.parse(rawPayload);
    // State expiration: 10 minutes
    if (Date.now() - data.timestamp > 10 * 60 * 1000) {
      return { valid: false, returnUrl: '/' };
    }
    if (data.nonce !== state) {
      return { valid: false, returnUrl: '/' };
    }
    return { valid: true, returnUrl: data.returnUrl || '/' };
  } catch {
    return { valid: false, returnUrl: '/' };
  }
}

export function getGoogleOAuthAuthorizeUrl(state: string, redirectUri?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const effectiveRedirect = redirectUri || getGoogleOAuthRedirectUri();
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: effectiveRedirect,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCodeForToken(code: string, redirectUri?: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const effectiveRedirect = redirectUri || getGoogleOAuthRedirectUri();

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) not configured');
  }

  const bodyParams = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: effectiveRedirect,
    grant_type: 'authorization_code'
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: bodyParams.toString()
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error({ status: response.status, body: errorBody }, 'Failed to exchange Google OAuth code for token');
    throw new Error(`Google token exchange failed with status ${response.status}: ${errorBody}`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error({ status: response.status, body: errorBody }, 'Failed to fetch Google user info');
    throw new Error(`Failed to fetch Google user profile: ${response.status} ${errorBody}`);
  }

  return response.json() as Promise<GoogleUserInfo>;
}

export async function upsertGoogleUser(info: GoogleUserInfo): Promise<GoogleUserSession> {
  const now = new Date().toISOString();
  
  const existing = db.select().from(users).where(eq(users.googleId, info.sub)).get();

  let userId: string;
  let role: string = 'admin';

  if (existing) {
    userId = existing.id;
    role = existing.role;
    db.update(users)
      .set({
        name: info.name || existing.name,
        email: info.email || existing.email,
        avatarUrl: info.picture || existing.avatarUrl,
        hostedDomain: info.hd || existing.hostedDomain,
        lastLoginAt: now
      })
      .where(eq(users.id, userId))
      .run();
  } else {
    userId = crypto.randomUUID();
    db.insert(users).values({
      id: userId,
      googleId: info.sub,
      email: info.email,
      name: info.name,
      avatarUrl: info.picture || '',
      hostedDomain: info.hd || null,
      role: 'admin',
      createdAt: now,
      lastLoginAt: now
    }).run();
  }

  return {
    id: userId,
    googleId: info.sub,
    email: info.email,
    name: info.name,
    picture: info.picture || '',
    hostedDomain: info.hd,
    role,
    connectedAt: now
  };
}
