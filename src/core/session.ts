// src/core/session.ts
// Pure Web Crypto implementation compatible with Node.js and Next.js Edge Middleware

export interface GoogleUserSession {
  id: string; // Database user id
  googleId: string;
  email: string;
  name: string;
  picture: string;
  hostedDomain?: string;
  role: string;
  connectedAt: string;
}

export const GOOGLE_SESSION_COOKIE_NAME = 'pp_google_session';
export const GOOGLE_STATE_COOKIE_NAME = 'pp_google_oauth_state';

async function getKeyBytes(customKey?: string): Promise<Uint8Array> {
  const rawKey = customKey || process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    const matches = rawKey.match(/.{1,2}/g);
    if (matches) {
      return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
    }
  }
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey));
  return new Uint8Array(hash);
}

export async function encryptSessionToken(session: GoogleUserSession, customKey?: string): Promise<string> {
  const keyBytes = await getKeyBytes(customKey);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = new TextEncoder().encode(JSON.stringify(session));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, payload);

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Convert to base64url string
  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function decryptSessionToken(token: string, customKey?: string): Promise<GoogleUserSession | null> {
  try {
    if (!token || typeof token !== 'string') return null;

    // Convert from base64url to Uint8Array
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    if (bytes.length < 28) {
      return null;
    }

    const iv = bytes.subarray(0, 12);
    const data = bytes.subarray(12);

    const keyBytes = await getKeyBytes(customKey);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes as unknown as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, data as unknown as BufferSource);
    const jsonStr = new TextDecoder().decode(decrypted);
    return JSON.parse(jsonStr) as GoogleUserSession;
  } catch {
    return null;
  }
}
