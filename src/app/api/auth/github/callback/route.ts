// src/app/api/auth/github/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForToken,
  fetchGitHubUser,
  encodeSessionCookie,
  GITHUB_SESSION_COOKIE_NAME,
  getGitHubRedirectUri,
  GitHubUserSession
} from '@/core/githubOAuth';
import { logger } from '@/core/logger';

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    logger.warn({ error, errorDescription }, '[GitHubOAuth Callback] User denied or GitHub returned error');
    return renderCallbackHtml({
      success: false,
      error: errorDescription || error || 'GitHub authorization was cancelled or denied.'
    });
  }

  if (!code) {
    return renderCallbackHtml({
      success: false,
      error: 'Missing authorization code from GitHub.'
    });
  }

  // Verify state
  const storedState = req.cookies.get('github_oauth_state')?.value;
  if (storedState && state && storedState !== state) {
    logger.warn({ state, storedState }, '[GitHubOAuth Callback] State mismatch');
    return renderCallbackHtml({
      success: false,
      error: 'OAuth state verification failed. Possible CSRF attack detected.'
    });
  }

  try {
    const origin = url.origin;
    const redirectUri = getGitHubRedirectUri(origin);

    const { accessToken } = await exchangeCodeForToken(code, redirectUri);
    const user = await fetchGitHubUser(accessToken);

    const session: GitHubUserSession = {
      token: accessToken,
      user,
      connectedAt: new Date().toISOString(),
      source: 'oauth'
    };

    const encoded = encodeSessionCookie(session);

    const response = renderCallbackHtml({
      success: true,
      user
    });

    response.cookies.set(GITHUB_SESSION_COOKIE_NAME, encoded, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600 // 7 days
    });

    response.cookies.delete('github_oauth_state');

    logger.info({ user: user.login }, '[GitHubOAuth Callback] Successfully connected GitHub user via OAuth');
    return response;
  } catch (err: any) {
    logger.error({ error: err.message }, '[GitHubOAuth Callback] Failed to complete token exchange');
    return renderCallbackHtml({
      success: false,
      error: err.message || 'Failed to complete authentication with GitHub.'
    });
  }
}

function renderCallbackHtml(payload: { success: boolean; user?: any; error?: string }) {
  const serialized = JSON.stringify(payload);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>GitHub Authorization - PatchPilot</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .card {
      background: #1e293b;
      border: 1px solid ${payload.success ? '#10b981' : '#f43f5e'};
      padding: 2rem;
      border-radius: 12px;
      max-width: 420px;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    h2 { margin: 0 0 0.5rem; color: #fff; font-size: 1.25rem; }
    p { color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .btn {
      display: inline-block;
      background: #2563eb;
      color: white;
      text-decoration: none;
      padding: 0.6rem 1.2rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>${payload.success ? 'Connected to GitHub! 🎉' : 'Authentication Failed ⚠️'}</h2>
    <p>${payload.success ? `Connected as <strong>@${payload.user?.login}</strong>. This window will close automatically.` : payload.error}</p>
    <a href="/wizard" class="btn">Return to Project Wizard</a>
  </div>
  <script>
    (function() {
      var data = ${serialized};
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'GITHUB_OAUTH_RESULT', payload: data }, '*');
        setTimeout(function() { window.close(); }, 800);
      } else {
        setTimeout(function() {
          window.location.href = '/wizard?github_connected=' + (data.success ? '1' : '0');
        }, 1200);
      }
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: payload.success ? 200 : 400,
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}
