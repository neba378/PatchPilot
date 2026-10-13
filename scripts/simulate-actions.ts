// scripts/simulate-actions.ts
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

async function main() {
  const fixtures = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'fixtures', 'sample-signals.json'), 'utf-8'));
  const payload = JSON.stringify(fixtures.gitHubActionsFailure);
  const secret = process.env.GITHUB_WEBHOOK_SECRET || 'github-webhook-secret-token';
  const url = `${process.env.APP_URL || 'http://localhost:3000'}/api/webhooks/github-actions`;

  const signature = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;

  console.log(`[Simulate Actions] Posting failure payload to ${url}...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': signature
      },
      body: payload
    });

    const result = await res.json();
    console.log(`[Simulate Actions] Status: ${res.status}`, result);
  } catch (err: any) {
    console.error(`[Simulate Actions] Failed to connect:`, err.message);
  }
}

main();
