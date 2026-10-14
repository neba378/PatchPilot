// backend/src/routes/eval.ts
import { Router, Request, Response } from 'express';
import { db } from '@/db';
import { evalRuns } from '@/db/schema';
import { desc } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { logger } from '@/core/logger';

export const evalRouter = Router();

evalRouter.get('/latest', async (_req: Request, res: Response) => {
  try {
    const latestDbRun = await db.select().from(evalRuns).orderBy(desc(evalRuns.timestamp)).limit(1);

    if (latestDbRun.length > 0) {
      return res.json({
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
        return res.json({
          run: { timestamp: files[0].replace('.json', '') },
          parsed: JSON.parse(fileContent)
        });
      }
    }

    return res.status(404).json({ error: 'No eval runs recorded yet' });
  } catch (err: any) {
    logger.error({ error: err.message }, '[Eval] Get latest failed');
    return res.status(500).json({ error: err.message });
  }
});
