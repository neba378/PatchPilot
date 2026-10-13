// src/app/api/eval/latest/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { evalRuns } from '@/db/schema';
import { desc } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const latestDbRun = await db.select().from(evalRuns).orderBy(desc(evalRuns.timestamp)).limit(1);

    if (latestDbRun.length > 0) {
      return NextResponse.json({
        run: latestDbRun[0],
        parsed: JSON.parse(latestDbRun[0].resultsJson)
      });
    }

    // Fallback: read latest file from eval/results/
    const resultsDir = path.join(process.cwd(), 'eval', 'results');
    if (fs.existsSync(resultsDir)) {
      const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('.json')).sort().reverse();
      if (files.length > 0) {
        const fileContent = fs.readFileSync(path.join(resultsDir, files[0]), 'utf-8');
        return NextResponse.json({
          run: { timestamp: files[0].replace('.json', '') },
          parsed: JSON.parse(fileContent)
        });
      }
    }

    return NextResponse.json({ error: 'No eval runs recorded yet' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
