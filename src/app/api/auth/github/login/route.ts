// src/app/api/auth/github/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  isGitHubOAuthConfigured,
  getGitHubOAuthAuthorizeUrl,
  getGitHubRedirectUri,
  fetchGitHubUser,
  encodeSessionCookie,
  GITHUB_SESSION_COOKIE_NAME,
  GitHubUserSession
} from '@/core/githubOAuth';
import { logger } from '@/core/logger';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const redirectUri = getGitHubRedirectUri(origin);

  // 1. If GitHub OAuth App is configured (Client ID + Secret), redirect directly to GitHub OAuth authorize
  if (isGitHubOAuthConfigured()) {
    const state = crypto.randomBytes(20).toString('hex');
    const authorizeUrl = getGitHubOAuthAuthorizeUrl(state, redirectUri);

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set('github_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600
    });

    return response;
  }

  // 2. If running with environment GitHub token (e.g. Fine-grained or Personal Access Token with repo access),
  // authenticate directly with GitHub API and establish the user session immediately
  const envToken = process.env.GITHUB_TOKEN;
  if (envToken && envToken !== 'mock') {
    try {
      const user = await fetchGitHubUser(envToken);
      const session: GitHubUserSession = {
        token: envToken,
        user,
        connectedAt: new Date().toISOString(),
        source: 'oauth'
      };

      const encoded = encodeSessionCookie(session);

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>GitHub Authorization - PatchPilot</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1.5rem;
    }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      padding: 2.25rem;
      border-radius: 12px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 16px 32px rgba(0,0,0,0.4);
    }
    .avatars {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 1.25rem;
    }
    .avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: 2px solid #58a6ff;
    }
    .icon {
      width: 40px;
      height: 40px;
      fill: #f0f6fc;
    }
    h2 {
      margin: 0 0 0.5rem;
      color: #f0f6fc;
      font-size: 1.25rem;
      font-weight: 600;
    }
    p {
      color: #8b949e;
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0 0 1.25rem;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(46, 160, 67, 0.15);
      border: 1px solid rgba(46, 160, 67, 0.4);
      color: #3fb950;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
    }
    .permissions-box {
      background: #0d1117;
      border: 1px solid #21262d;
      border-radius: 8px;
      padding: 0.85rem;
      text-align: left;
      font-size: 0.8rem;
      color: #8b949e;
      margin-bottom: 1.5rem;
    }
    .permissions-box ul {
      margin: 0.35rem 0 0;
      padding-left: 1.2rem;
      color: #c9d1d9;
    }
    .btn {
      display: inline-block;
      background: #238636;
      color: #ffffff;
      text-decoration: none;
      padding: 0.65rem 1.25rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: background 0.15s ease;
    }
    .btn:hover {
      background: #2ea043;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="avatars">
      <svg class="icon" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
      <img class="avatar" src="${user.avatarUrl}" alt="${user.login}" />
    </div>

    <div class="status-badge">
      <span>●</span> Connected to GitHub
    </div>

    <h2>Authorized as @${user.login}</h2>
    <p>${user.name || user.login} authenticated successfully. Access to your GitHub repositories is active.</p>

    <div class="permissions-box">
      <strong>Active Permissions:</strong>
      <ul>
        <li>List and select repositories</li>
        <li>Inspect code and branch metadata</li>
        <li>Create pull requests for incident fixes</li>
      </ul>
    </div>

    <button id="closeBtn" class="btn" onclick="finishAuth()">Return to PatchPilot</button>
  </div>

  <script>
    var payload = {
      success: true,
      user: ${JSON.stringify(user)}
    };

    function finishAuth() {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'GITHUB_OAUTH_RESULT', payload: payload }, '*');
        window.close();
      } else {
        window.location.href = '/wizard';
      }
    }

    // Automatically notify opener and close popup
    setTimeout(function() {
      finishAuth();
    }, 700);
  </script>
</body>
</html>`;

      const response = new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });

      response.cookies.set(GITHUB_SESSION_COOKIE_NAME, encoded, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 3600
      });

      logger.info({ user: user.login }, '[GitHub Login] Authenticated user via environment GitHub token');
      return response;
    } catch (err: any) {
      logger.error({ error: err.message }, '[GitHub Login] Failed to authenticate user with GitHub');
      return new NextResponse(
        `<!DOCTYPE html><html><body style="font-family: sans-serif; background: #0d1117; color: #f85149; padding: 2rem; text-align: center;">
          <h2>GitHub Authentication Failed</h2>
          <p>${err.message}</p>
        </body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
  }

  // 3. Fallback if no GitHub credentials exist in environment
  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family: sans-serif; background: #0d1117; color: #f0f6fc; padding: 2rem; text-align: center;">
      <h2>GitHub Not Configured</h2>
      <p style="color: #8b949e;">Please configure your GitHub credentials in the application environment (.env).</p>
    </body></html>`,
    { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
