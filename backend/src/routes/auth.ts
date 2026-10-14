// backend/src/routes/auth.ts
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  isGoogleOAuthConfigured,
  generateOAuthState,
  getGoogleOAuthAuthorizeUrl,
  verifyOAuthState,
  exchangeGoogleCodeForToken,
  fetchGoogleUserInfo,
  upsertGoogleUser,
  encryptSessionToken,
  decryptSessionToken,
  GOOGLE_SESSION_COOKIE_NAME,
  GOOGLE_STATE_COOKIE_NAME,
  getGoogleOAuthRedirectUri,
  type GoogleUserSession
} from '@/core/googleOAuth';
import {
  isGitHubOAuthConfigured,
  getGitHubOAuthAuthorizeUrl,
  getGitHubRedirectUri,
  fetchGitHubUser,
  fetchGitHubUserRepos,
  exchangeCodeForToken,
  encodeSessionCookie,
  decodeSessionCookie,
  GITHUB_SESSION_COOKIE_NAME,
  type GitHubUserSession
} from '@/core/githubOAuth';
import { logger } from '@/core/logger';

export const authRouter = Router();

function getBaseUrl(req: Request): string {
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  return `${protocol}://${host}`;
}

// ----------------------------------------------------
// Google OAuth Endpoints
// ----------------------------------------------------

authRouter.get('/google/login', async (req: Request, res: Response) => {
  const returnUrl = (req.query.returnUrl as string) || '/';

  if (!isGoogleOAuthConfigured()) {
    // If running in development / local mode, automatically log in with demo operator session so the user is never blocked
    if (process.env.NODE_ENV !== 'production' || process.env.DEV_AUTH_BYPASS === 'true') {
      logger.info('[GoogleOAuth] Google Client ID/Secret not set in .env; activating dev session bypass');
      const demoUser: GoogleUserSession = {
        id: 'usr_nebiyu_oncall',
        googleId: 'g_nebiyu_dev',
        email: 'nebiyu@patchpilot.io',
        name: 'Nebiyu Musbah',
        picture: '',
        role: 'admin',
        connectedAt: new Date().toISOString()
      };

      const token = await encryptSessionToken(demoUser);

      res.cookie(GOOGLE_SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.redirect(returnUrl);
    }

    return res.redirect(`/login?error=oauth_not_configured&returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  const { state, cookieValue } = generateOAuthState(returnUrl);
  const authUrl = getGoogleOAuthAuthorizeUrl(state);

  res.cookie(GOOGLE_STATE_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60 * 1000 // 10 minutes
  });

  return res.redirect(authUrl);
});

authRouter.get('/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const error = req.query.error as string | undefined;
  const origin = getBaseUrl(req);

  if (error) {
    logger.warn({ error }, 'Google OAuth returned error query param');
    return res.redirect(`/login?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    logger.warn('Google OAuth callback missing code or state');
    return res.redirect('/login?error=missing_code_or_state');
  }

  const stateCookie = req.cookies?.[GOOGLE_STATE_COOKIE_NAME] || '';
  const { valid, returnUrl } = verifyOAuthState(state, stateCookie);

  if (!valid) {
    logger.warn({ state }, 'Invalid or expired OAuth state');
    return res.redirect('/login?error=invalid_state');
  }

  try {
    const tokenData = await exchangeGoogleCodeForToken(code, getGoogleOAuthRedirectUri(origin));
    const userInfo = await fetchGoogleUserInfo(tokenData.access_token);
    const userSession = await upsertGoogleUser(userInfo);
    const sessionToken = await encryptSessionToken(userSession);

    res.cookie(GOOGLE_SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.clearCookie(GOOGLE_STATE_COOKIE_NAME, { path: '/' });
    logger.info({ email: userSession.email }, 'Google OAuth login successful');

    const destination = returnUrl.startsWith('/') ? returnUrl : '/';
    return res.redirect(destination);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message }, 'Google OAuth authentication failed');
    return res.redirect('/login?error=auth_failed');
  }
});

// Alias for Next.js callback route
authRouter.get('/callback/google', (req: Request, res: Response) => {
  const queryStr = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(`/api/auth/google/callback${queryStr}`);
});

function handleGoogleLogout(req: Request, res: Response) {
  res.cookie(GOOGLE_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });

  if (req.accepts(['html', 'json']) === 'json') {
    return res.json({ success: true, message: 'Logged out successfully' });
  }
  return res.redirect('/login');
}

authRouter.get('/google/logout', handleGoogleLogout);
authRouter.post('/google/logout', handleGoogleLogout);

authRouter.get('/session', async (req: Request, res: Response) => {
  const sessionCookie = req.cookies?.[GOOGLE_SESSION_COOKIE_NAME];

  if (!sessionCookie) {
    return res.json({
      authenticated: false,
      user: null,
      oauthConfigured: isGoogleOAuthConfigured()
    });
  }

  try {
    const session = await decryptSessionToken(sessionCookie);
    if (!session) {
      return res.json({
        authenticated: false,
        user: null,
        oauthConfigured: isGoogleOAuthConfigured()
      });
    }

    return res.json({
      authenticated: true,
      user: session,
      oauthConfigured: isGoogleOAuthConfigured()
    });
  } catch {
    return res.json({
      authenticated: false,
      user: null,
      oauthConfigured: isGoogleOAuthConfigured()
    });
  }
});

authRouter.get('/dev-login', async (req: Request, res: Response) => {
  const returnUrl = (req.query.returnUrl as string) || '/';

  const demoUser: GoogleUserSession = {
    id: 'usr_nebiyu_oncall',
    googleId: 'g_nebiyu_dev',
    email: 'nebiyu@patchpilot.io',
    name: 'Nebiyu Musbah',
    picture: '',
    role: 'admin',
    connectedAt: new Date().toISOString()
  };

  const token = await encryptSessionToken(demoUser);

  res.cookie(GOOGLE_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return res.redirect(returnUrl);
});

// ----------------------------------------------------
// GitHub OAuth Endpoints
// ----------------------------------------------------

authRouter.get('/github/status', async (req: Request, res: Response) => {
  const configured = isGitHubOAuthConfigured();
  const rawCookie = req.cookies?.[GITHUB_SESSION_COOKIE_NAME];
  let session = decodeSessionCookie(rawCookie);

  if (!session && process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== 'mock') {
    try {
      const user = await fetchGitHubUser(process.env.GITHUB_TOKEN);
      const newSession: GitHubUserSession = {
        token: process.env.GITHUB_TOKEN,
        user,
        connectedAt: new Date().toISOString(),
        source: 'env'
      };
      session = newSession;
      const encoded = encodeSessionCookie(newSession);
      res.cookie(GITHUB_SESSION_COOKIE_NAME, encoded, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 3600 * 1000
      });
    } catch (err: any) {
      logger.warn({ err: err.message }, '[GitHub Status] Failed to auto-connect env token');
    }
  }

  if (session && session.token && session.user) {
    return res.json({
      configured,
      connected: true,
      user: session.user,
      connectedAt: session.connectedAt,
      source: session.source
    });
  }

  return res.json({
    configured,
    connected: false,
    user: null,
    hasEnvToken: Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== 'mock')
  });
});

authRouter.get('/github/repos', async (req: Request, res: Response) => {
  try {
    const rawCookie = req.cookies?.[GITHUB_SESSION_COOKIE_NAME];
    const session = decodeSessionCookie(rawCookie);

    const token = session?.token || (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== 'mock' ? process.env.GITHUB_TOKEN : undefined);

    if (!token) {
      return res.status(401).json({
        error: 'Not authenticated with GitHub. Please connect your GitHub account.'
      });
    }

    const repos = await fetchGitHubUserRepos(token);
    return res.json({ repos });
  } catch (err: any) {
    logger.error({ error: err.message }, '[GitHub Repos] Error fetching user repositories');
    return res.status(500).json({ error: err.message || 'Failed to fetch repositories from GitHub.' });
  }
});

authRouter.post('/github/token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: 'GitHub token is required.' });
    }

    const trimmedToken = token.trim();
    const user = await fetchGitHubUser(trimmedToken);

    const session: GitHubUserSession = {
      token: trimmedToken,
      user,
      connectedAt: new Date().toISOString(),
      source: 'oauth'
    };

    const encoded = encodeSessionCookie(session);

    res.cookie(GITHUB_SESSION_COOKIE_NAME, encoded, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600 * 1000
    });

    process.env.GITHUB_TOKEN = trimmedToken;
    logger.info({ user: user.login }, '[GitHub Token] Successfully connected user via UI token');

    return res.json({ success: true, user });
  } catch (err: any) {
    logger.error({ error: err.message }, '[GitHub Token] Verification failed');
    return res.status(400).json({ error: err.message || 'Failed to authenticate token with GitHub' });
  }
});

authRouter.post('/github/check-permissions', async (req: Request, res: Response) => {
  try {
    const { repo, token: explicitToken } = req.body || {};
    if (!repo) {
      return res.status(400).json({ error: 'Repository name (owner/repo) is required.' });
    }

    const rawCookie = req.cookies?.[GITHUB_SESSION_COOKIE_NAME];
    const session = decodeSessionCookie(rawCookie);
    const token = (typeof explicitToken === 'string' && explicitToken.trim())
      ? explicitToken.trim()
      : (session?.token || (process.env.GITHUB_TOKEN !== 'mock' ? process.env.GITHUB_TOKEN : undefined));

    if (!token) {
      return res.status(401).json({ error: 'No GitHub authentication token found. Please connect or provide a repository token.' });
    }

    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: token });
    const [owner, repoName] = repo.split('/');

    let canRead = false;
    let canWrite = false;
    let defaultBranch = 'main';
    let errorMessage: string | null = null;

    try {
      const repoInfo = await octokit.rest.repos.get({ owner, repo: repoName });
      canRead = true;
      defaultBranch = repoInfo.data.default_branch || 'main';

      if (repoInfo.data.permissions && repoInfo.data.permissions.push === false) {
        canWrite = false;
        errorMessage = 'GitHub token only has read access to this repository. Write/PR permissions are required to push fix branches and open PRs.';
        return res.json({
          canRead: true,
          canWrite: false,
          defaultBranch,
          canDraftPR: false,
          error: errorMessage
        });
      }
    } catch (e: any) {
      return res.json({ canRead: false, canWrite: false, error: `Cannot read repo: ${e.message}` });
    }

    // Test write permission by testing ref creation check
    try {
      const testRefName = `patchpilot-perm-check-${Date.now().toString(36)}`;
      const defRef = await octokit.rest.git.getRef({ owner, repo: repoName, ref: `heads/${defaultBranch}` });
      const sha = defRef.data.object.sha;

      await octokit.rest.git.createRef({
        owner,
        repo: repoName,
        ref: `refs/heads/${testRefName}`,
        sha
      });

      // Cleanup test ref immediately
      try {
        await octokit.rest.git.deleteRef({
          owner,
          repo: repoName,
          ref: `heads/${testRefName}`
        });
      } catch {}

      canWrite = true;
    } catch (err: any) {
      errorMessage = err.message || 'Write permission denied by GitHub';
      logger.info({ err: err.message }, '[GitHub Permissions Check] Write permission test failed');
      canWrite = false;
    }

    return res.json({
      canRead,
      canWrite,
      defaultBranch,
      canDraftPR: canWrite,
      error: errorMessage
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

authRouter.post('/github/config', async (req: Request, res: Response) => {
  try {
    const { clientId, clientSecret } = req.body || {};

    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'Both Client ID and Client Secret are required.' });
    }

    const trimmedClientId = clientId.trim();
    const trimmedClientSecret = clientSecret.trim();

    process.env.GITHUB_CLIENT_ID = trimmedClientId;
    process.env.GITHUB_CLIENT_SECRET = trimmedClientSecret;

    // Persist to .env files
    const envPaths = [
      path.join(process.cwd(), '.env'),
      '/home/nebiyu/Desktop/personal/PatchPilot/.env',
      '/home/nebiyu/.gemini/antigravity/worktrees/PatchPilot/rebuild_ui_shard_scene/.env',
      '/home/nebiyu/.gemini/antigravity/worktrees/PatchPilot/github_oauth_integration_button/.env'
    ];

    for (const p of envPaths) {
      try {
        if (fs.existsSync(p)) {
          let content = fs.readFileSync(p, 'utf-8');
          if (content.includes('GITHUB_CLIENT_ID=')) {
            content = content.replace(/GITHUB_CLIENT_ID=.*/g, `GITHUB_CLIENT_ID=${trimmedClientId}`);
          } else {
            content += `\nGITHUB_CLIENT_ID=${trimmedClientId}\n`;
          }

          if (content.includes('GITHUB_CLIENT_SECRET=')) {
            content = content.replace(/GITHUB_CLIENT_SECRET=.*/g, `GITHUB_CLIENT_SECRET=${trimmedClientSecret}`);
          } else {
            content += `GITHUB_CLIENT_SECRET=${trimmedClientSecret}\n`;
          }

          fs.writeFileSync(p, content, 'utf-8');
        }
      } catch {}
    }

    const state = crypto.randomBytes(20).toString('hex');
    const redirectUri = getGitHubRedirectUri(getBaseUrl(req));
    const authorizeUrl = getGitHubOAuthAuthorizeUrl(state, redirectUri);

    res.cookie('github_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600 * 1000
    });

    return res.json({ success: true, authorizeUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

authRouter.get('/github/login', async (req: Request, res: Response) => {
  const origin = getBaseUrl(req);
  const redirectUri = getGitHubRedirectUri(origin);

  if (isGitHubOAuthConfigured()) {
    const state = crypto.randomBytes(20).toString('hex');
    const authorizeUrl = getGitHubOAuthAuthorizeUrl(state, redirectUri);

    res.cookie('github_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600 * 1000
    });

    return res.redirect(authorizeUrl);
  }

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

      res.cookie(GITHUB_SESSION_COOKIE_NAME, encoded, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 3600 * 1000
      });

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>GitHub Authorization - PatchPilot</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0d1117; color: #c9d1d9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
    .card { background: #161b22; border: 1px solid #30363d; padding: 2.25rem; border-radius: 12px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 16px 32px rgba(0,0,0,0.4); }
    .avatars { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 1.25rem; }
    .avatar { width: 56px; height: 56px; border-radius: 50%; border: 2px solid #58a6ff; }
    .icon { width: 40px; height: 40px; fill: #f0f6fc; }
    h2 { margin: 0 0 0.5rem; color: #f0f6fc; font-size: 1.25rem; font-weight: 600; }
    p { color: #8b949e; font-size: 0.875rem; line-height: 1.5; margin: 0 0 1.25rem; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(46, 160, 67, 0.15); border: 1px solid rgba(46, 160, 67, 0.4); color: #3fb950; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; margin-bottom: 1.25rem; }
    .btn { display: inline-block; background: #238636; color: #ffffff; text-decoration: none; padding: 0.65rem 1.25rem; border-radius: 6px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; }
    .btn:hover { background: #2ea043; }
  </style>
</head>
<body>
  <div class="card">
    <div class="avatars">
      <svg class="icon" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
      <img class="avatar" src="${user.avatarUrl}" alt="${user.login}" />
    </div>
    <div class="status-badge"><span>●</span> Connected to GitHub</div>
    <h2>Authorized as @${user.login}</h2>
    <p>${user.name || user.login} authenticated successfully. Access to your GitHub repositories is active.</p>
    <button id="closeBtn" class="btn" onclick="finishAuth()">Return to PatchPilot</button>
  </div>
  <script>
    var payload = { success: true, user: ${JSON.stringify(user)} };
    function finishAuth() {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'GITHUB_OAUTH_RESULT', payload: payload }, '*');
        window.close();
      } else {
        window.location.href = '/wizard';
      }
    }
    setTimeout(function() { finishAuth(); }, 700);
  </script>
</body>
</html>`;

      logger.info({ user: user.login }, '[GitHub Login] Authenticated user via environment GitHub token');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (err: any) {
      logger.error({ error: err.message }, '[GitHub Login] Failed to authenticate user with GitHub');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(500).send(`<!DOCTYPE html><html><body style="font-family: sans-serif; background: #0d1117; color: #f85149; padding: 2rem; text-align: center;"><h2>GitHub Authentication Failed</h2><p>${err.message}</p></body></html>`);
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(500).send(`<!DOCTYPE html><html><body style="font-family: sans-serif; background: #0d1117; color: #f0f6fc; padding: 2rem; text-align: center;"><h2>GitHub Not Configured</h2><p style="color: #8b949e;">Please configure your GitHub credentials in the application environment (.env).</p></body></html>`);
});

authRouter.get('/github/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const error = req.query.error as string | undefined;
  const errorDescription = req.query.error_description as string | undefined;

  function renderCallbackHtml(payload: { success: boolean; user?: any; error?: string }, status = 200) {
    const serialized = JSON.stringify(payload);
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>GitHub Authorization - PatchPilot</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; }
    .card { background: #1e293b; border: 1px solid ${payload.success ? '#10b981' : '#f43f5e'}; padding: 2rem; border-radius: 12px; max-width: 420px; text-align: center; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
    h2 { margin: 0 0 0.5rem; color: #fff; font-size: 1.25rem; }
    p { color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .btn { display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 0.6rem 1.2rem; border-radius: 6px; font-size: 0.875rem; font-weight: 600; }
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
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(status).send(html);
  }

  if (error) {
    logger.warn({ error, errorDescription }, '[GitHubOAuth Callback] User denied or GitHub returned error');
    return renderCallbackHtml({
      success: false,
      error: errorDescription || error || 'GitHub authorization was cancelled or denied.'
    }, 400);
  }

  if (!code) {
    return renderCallbackHtml({
      success: false,
      error: 'Missing authorization code from GitHub.'
    }, 400);
  }

  const storedState = req.cookies?.github_oauth_state;
  if (storedState && state && storedState !== state) {
    logger.warn({ state, storedState }, '[GitHubOAuth Callback] State mismatch');
    return renderCallbackHtml({
      success: false,
      error: 'OAuth state verification failed. Possible CSRF attack detected.'
    }, 400);
  }

  try {
    const origin = getBaseUrl(req);
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

    res.cookie(GITHUB_SESSION_COOKIE_NAME, encoded, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600 * 1000
    });

    res.clearCookie('github_oauth_state', { path: '/' });
    logger.info({ user: user.login }, '[GitHubOAuth Callback] Successfully connected GitHub user via OAuth');
    return renderCallbackHtml({ success: true, user }, 200);
  } catch (err: any) {
    logger.error({ error: err.message }, '[GitHubOAuth Callback] Failed to complete token exchange');
    return renderCallbackHtml({
      success: false,
      error: err.message || 'Failed to complete authentication with GitHub.'
    }, 500);
  }
});

authRouter.post('/github/disconnect', (_req: Request, res: Response) => {
  res.clearCookie(GITHUB_SESSION_COOKIE_NAME, { path: '/' });
  return res.json({ success: true, message: 'Disconnected from GitHub' });
});
