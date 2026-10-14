// src/app/api/auth/github/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  isGitHubOAuthConfigured,
  getGitHubOAuthAuthorizeUrl,
  getGitHubRedirectUri
} from '@/core/githubOAuth';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const redirectUri = getGitHubRedirectUri(origin);

  // If already configured in .env, redirect directly to GitHub OAuth login
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

  // If not yet configured, render a clean setup screen in this tab to enter Client ID & Secret
  const registerUrl = `https://github.com/settings/applications/new?oauth_application[name]=PatchPilot&oauth_application[url]=${encodeURIComponent(origin)}&oauth_application[callback_url]=${encodeURIComponent(redirectUri)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Connect GitHub OAuth - PatchPilot</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #090d16;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1.5rem;
    }
    .card {
      background: #111827;
      border: 1px solid #1f293d;
      padding: 2.25rem;
      border-radius: 14px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.7);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .icon {
      width: 32px;
      height: 32px;
      fill: #fff;
    }
    h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffffff;
    }
    p {
      color: #94a3b8;
      font-size: 0.85rem;
      line-height: 1.5;
      margin: 0 0 1.25rem;
    }
    .info-box {
      background: rgba(37, 99, 235, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.25rem;
      font-size: 0.8rem;
      color: #cbd5e1;
    }
    .reg-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      background: #2563eb;
      color: #ffffff;
      text-decoration: none;
      padding: 0.65rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-top: 0.75rem;
      box-sizing: border-box;
      transition: background 0.15s ease;
    }
    .reg-btn:hover {
      background: #1d4ed8;
    }
    .form-group {
      margin-bottom: 1rem;
      text-align: left;
    }
    label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 0.35rem;
    }
    input {
      width: 100%;
      padding: 0.6rem 0.75rem;
      background: #0a0f1d;
      border: 1px solid #1e293b;
      border-radius: 6px;
      color: #f8fafc;
      font-family: monospace;
      font-size: 0.85rem;
      box-sizing: border-box;
      outline: none;
    }
    input:focus {
      border-color: #3b82f6;
    }
    .submit-btn {
      width: 100%;
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      margin-top: 0.5rem;
      transition: background 0.15s ease;
    }
    .submit-btn:hover {
      background: #059669;
    }
    .error {
      color: #f43f5e;
      font-size: 0.8rem;
      margin-top: 0.75rem;
      display: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <svg class="icon" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
      <h2>Sign in with GitHub</h2>
    </div>

    <p>To authorize PatchPilot with your GitHub credentials via official OAuth, provide your GitHub OAuth App credentials.</p>

    <div class="info-box">
      <strong>Step 1:</strong> Register a GitHub OAuth App (prefilled with your callback URL):
      <a href="${registerUrl}" target="_blank" class="reg-btn">
        Open GitHub OAuth App Registration &rarr;
      </a>
    </div>

    <form id="oauthForm">
      <div class="form-group">
        <label>Step 2: Enter GitHub Client ID</label>
        <input type="text" id="clientId" placeholder="e.g. Ov23li..." required />
      </div>

      <div class="form-group">
        <label>Enter GitHub Client Secret</label>
        <input type="password" id="clientSecret" placeholder="e.g. 8f6b..." required />
      </div>

      <button type="submit" id="btn" class="submit-btn">Save & Authorize with GitHub &rarr;</button>
      <div id="error" class="error"></div>
    </form>
  </div>

  <script>
    document.getElementById('oauthForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      var btn = document.getElementById('btn');
      var err = document.getElementById('error');
      var clientId = document.getElementById('clientId').value.trim();
      var clientSecret = document.getElementById('clientSecret').value.trim();

      btn.disabled = true;
      btn.innerText = 'Connecting to GitHub...';
      err.style.display = 'none';

      try {
        var res = await fetch('/api/auth/github/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: clientId, clientSecret: clientSecret })
        });
        var data = await res.json();
        if (data.success && data.authorizeUrl) {
          window.location.href = data.authorizeUrl;
        } else {
          err.innerText = data.error || 'Failed to save GitHub credentials.';
          err.style.display = 'block';
          btn.disabled = false;
          btn.innerText = 'Save & Authorize with GitHub →';
        }
      } catch (ex) {
        err.innerText = ex.message;
        err.style.display = 'block';
        btn.disabled = false;
        btn.innerText = 'Save & Authorize with GitHub →';
      }
    });
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
