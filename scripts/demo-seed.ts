// scripts/demo-seed.ts
import fs from 'fs';
import path from 'path';

async function main() {
  const targetRepo = process.argv[2] || 'nebiyu-org/checkout-api-service';
  console.log(`\n🌱 [PatchPilot Demo Seed] Preparing sample repository: ${targetRepo}`);
  console.log(`Sample fixture app located at: fixtures/demo-app/\n`);

  console.log(`To push this demo app to your own GitHub repository:`);
  console.log(`  1. cd fixtures/demo-app`);
  console.log(`  2. git init && git checkout -b main`);
  console.log(`  3. git add . && git commit -m "feat: initial commit with checkout service"`);
  console.log(`  4. git remote add origin https://github.com/<YOUR_USER>/<YOUR_REPO>.git`);
  console.log(`  5. git push -u origin main\n`);
  console.log(`PatchPilot is configured to monitor this repository automatically!\n`);
}

main();
