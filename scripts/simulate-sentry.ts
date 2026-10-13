// scripts/simulate-sentry.ts
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

async function main() {
  const fixtures = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'fixtures', 'sample-signals.json'), 'utf-8'));
  const payload = JSON.stringify(fixtures.sentryError);
  const secret = process.env.SENTRY_WEBHOOK_SECRET || 'sentry-webhook-secret-token';
  const url = `${process.env.APP_URL || 'http://localhost:3000'}/api/webhooks/sentry`;

  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  console.log(`[Simulate Sentry] Posting error payload to ${url}...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'sentry-hook-signature': signature
      },
      body: payload
    });

    const result = await res.json();
    console.log(`[Simulate Sentry] Status: ${res.status}`, result);
  } catch (err: any) {
    console.error(`[Simulate Sentry] Failed to connect:`, err.message);
  }
}

main();
