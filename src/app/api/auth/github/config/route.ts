// src/app/api/auth/github/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getGitHubOAuthAuthorizeUrl, getGitHubRedirectUri } from '@/core/githubOAuth';

export async function POST(req: NextRequest) {
  try {
    const { clientId, clientSecret } = await req.json();

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Both Client ID and Client Secret are required.' }, { status: 400 });
    }

    const trimmedClientId = clientId.trim();
    const trimmedClientSecret = clientSecret.trim();

    process.env.GITHUB_CLIENT_ID = trimmedClientId;
    process.env.GITHUB_CLIENT_SECRET = trimmedClientSecret;

    // Persist to .env files in current worktree and main repo if possible
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
    const redirectUri = getGitHubRedirectUri(req.nextUrl.origin);
    const authorizeUrl = getGitHubOAuthAuthorizeUrl(state, redirectUri);

    const response = NextResponse.json({ success: true, authorizeUrl });
    response.cookies.set('github_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
