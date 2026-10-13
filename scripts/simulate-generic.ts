// scripts/simulate-generic.ts
import fs from 'fs';
import path from 'path';

async function main() {
  const fixtures = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'fixtures', 'sample-signals.json'), 'utf-8'));
  const payload = JSON.stringify(fixtures.genericWebhook);
  const url = `${process.env.APP_URL || 'http://localhost:3000'}/api/webhooks/generic`;

  console.log(`[Simulate Generic] Posting payload to ${url}...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    });

    const result = await res.json();
    console.log(`[Simulate Generic] Status: ${res.status}`, result);
  } catch (err: any) {
    console.error(`[Simulate Generic] Failed to connect:`, err.message);
  }
}

main();
