// src/core/githubOAuth.ts
import { logger } from './logger';
import { Octokit } from '@octokit/rest';

export interface GitHubUserSession {
  token: string;
  user: {
    id: number;
    login: string;
    name: string;
    avatarUrl: string;
    email?: string;
    htmlUrl: string;
  };
  connectedAt: string;
  source: 'oauth';
}

export interface GitHubRepoSummary {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  private: boolean;
  description: string | null;
  htmlUrl: string;
  updatedAt?: string | null;
}

export const GITHUB_SESSION_COOKIE_NAME = 'pp_gh_session';

export function isGitHubOAuthConfigured(): boolean {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function getGitHubRedirectUri(reqOrigin?: string): string {
  if (process.env.GITHUB_REDIRECT_URI) {
    return process.env.GITHUB_REDIRECT_URI;
  }
  const baseUrl = reqOrigin || process.env.APP_URL || 'http://localhost:3000';
  return `${baseUrl.replace(/\/$/, '')}/api/auth/github/callback`;
}

export function getGitHubOAuthAuthorizeUrl(state: string, redirectUri?: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID || '';
  const effectiveRedirect = redirectUri || getGitHubRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: effectiveRedirect,
    scope: 'repo read:user user:email',
    state,
    allow_signup: 'true'
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, redirectUri?: string): Promise<{ accessToken: string; scope: string; tokenType: string }> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be configured in environment');
  }

  const effectiveRedirect = redirectUri || getGitHubRedirectUri();

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'PatchPilot-OAuth'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: effectiveRedirect
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, body: errorText }, '[GitHubOAuth] Token exchange failed');
    throw new Error(`GitHub token exchange HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (data.error) {
    logger.error({ error: data.error, description: data.error_description }, '[GitHubOAuth] OAuth error received');
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  if (!data.access_token) {
    throw new Error('No access_token returned from GitHub token exchange');
  }

  return {
    accessToken: data.access_token,
    scope: data.scope || '',
    tokenType: data.token_type || 'bearer'
  };
}

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUserSession['user']> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'PatchPilot-OAuth',
      Accept: 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, body: errorText }, '[GitHubOAuth] Failed to fetch authenticated user');
    throw new Error(`Failed to fetch user profile from GitHub (${response.status})`);
  }

  const data = await response.json();
  return {
    id: data.id,
    login: data.login,
    name: data.name || data.login,
    avatarUrl: data.avatar_url,
    email: data.email || undefined,
    htmlUrl: data.html_url
  };
}

export async function fetchGitHubUserRepos(accessToken: string): Promise<GitHubRepoSummary[]> {
  const octokit = new Octokit({ auth: accessToken });
  try {
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
      affiliation: 'owner,collaborator,organization_member'
    });

    return data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      defaultBranch: repo.default_branch,
      private: repo.private,
      description: repo.description,
      htmlUrl: repo.html_url,
      updatedAt: repo.updated_at
    }));
  } catch (err: any) {
    logger.error({ error: err.message }, '[GitHubOAuth] Failed to list repositories');
    throw new Error(`GitHub repository lookup failed: ${err.message}`);
  }
}

export function encodeSessionCookie(session: GitHubUserSession): string {
  const jsonStr = JSON.stringify(session);
  return Buffer.from(jsonStr, 'utf-8').toString('base64url');
}

export function decodeSessionCookie(cookieValue?: string | null): GitHubUserSession | null {
  if (!cookieValue) return null;
  try {
    const jsonStr = Buffer.from(cookieValue, 'base64url').toString('utf-8');
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.token && parsed.user?.login) {
      return parsed as GitHubUserSession;
    }
  } catch (err) {
    logger.warn({ error: (err as any).message }, '[GitHubOAuth] Failed to decode session cookie');
  }
  return null;
}
