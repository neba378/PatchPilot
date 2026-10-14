// src/core/__tests__/session.test.ts
import { describe, it, expect } from 'vitest';
import { encryptSessionToken, decryptSessionToken, type GoogleUserSession } from '../session';

describe('Web Crypto Session Management', () => {
  const mockSession: GoogleUserSession = {
    id: 'user-uuid-12345',
    googleId: 'google-sub-987654321',
    email: 'engineer@patchpilot.io',
    name: 'PatchPilot SRE Engineer',
    picture: 'https://lh3.googleusercontent.com/a/mock-avatar',
    hostedDomain: 'patchpilot.io',
    role: 'admin',
    connectedAt: new Date().toISOString()
  };

  it('should encrypt and decrypt a Google user session correctly', async () => {
    const encryptedToken = await encryptSessionToken(mockSession);
    expect(typeof encryptedToken).toBe('string');
    expect(encryptedToken.length).toBeGreaterThan(32);

    const decryptedSession = await decryptSessionToken(encryptedToken);
    expect(decryptedSession).not.toBeNull();
    expect(decryptedSession?.id).toBe(mockSession.id);
    expect(decryptedSession?.googleId).toBe(mockSession.googleId);
    expect(decryptedSession?.email).toBe(mockSession.email);
    expect(decryptedSession?.name).toBe(mockSession.name);
    expect(decryptedSession?.picture).toBe(mockSession.picture);
    expect(decryptedSession?.hostedDomain).toBe(mockSession.hostedDomain);
    expect(decryptedSession?.role).toBe('admin');
  });

  it('should fail decryption when given a tampered token', async () => {
    const validToken = await encryptSessionToken(mockSession);
    // Tamper with the token characters
    const tampered = validToken.slice(0, -4) + 'zzzz';
    const result = await decryptSessionToken(tampered);
    expect(result).toBeNull();
  });

  it('should fail decryption when given an invalid or empty token', async () => {
    expect(await decryptSessionToken('')).toBeNull();
    expect(await decryptSessionToken('not-a-valid-token')).toBeNull();
    expect(await decryptSessionToken('short')).toBeNull();
  });

  it('should fail decryption when key does not match', async () => {
    const key1 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const key2 = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    
    const token = await encryptSessionToken(mockSession, key1);
    const decryptedWithDiffKey = await decryptSessionToken(token, key2);
    expect(decryptedWithDiffKey).toBeNull();
  });
});
