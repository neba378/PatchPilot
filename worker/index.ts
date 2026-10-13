// worker/index.ts
import { db } from '../src/db';
import { jobs, incidents } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../src/core/logger';
import { buildInvestigationContext } from '../src/core/contextBuilder';
import { runInvestigation } from '../src/agents/investigator';
import { runVerifierPass } from '../src/agents/verifier';
import { telegramAdapter } from '../src/adapters/channels/telegram';
import { executeSandboxFix } from '../src/core/sandboxFixPipeline';
import { telegramPoller } from '../src/adapters/channels/telegramPoller';

async function processJob(job: any): Promise<void> {
  const payload = JSON.parse(job.payload);
  logger.info({ jobId: job.id, type: job.type }, '[Worker] Processing job');

  switch (job.type) {
    case 'normalize_signal': {
      // Normalization is completed upon ingest, triggers investigation
      break;
    }

    case 'investigate': {
      const incident = await db.select().from(incidents).where(eq(incidents.id, payload.incidentId)).get();
      if (!incident) break;

      await db.update(incidents).set({ status: 'diagnosing' }).where(eq(incidents.id, incident.id));

      const ctx = await buildInvestigationContext(incident as any);
      const investigation = await runInvestigation(ctx);
      const verification = await runVerifierPass(investigation);

      if (verification.shouldAbstain) {
        await db.update(incidents).set({
          status: 'abstained',
          severity: 'medium'
        }).where(eq(incidents.id, incident.id));
        logger.info({ incidentId: incident.id, reason: verification.abstainReason }, '[Worker] Investigation abstained');
      } else {
        await db.update(incidents).set({
          status: 'awaiting_approval'
        }).where(eq(incidents.id, incident.id));

        // Dispatch alert card to Telegram
        await telegramAdapter.sendAlert(incident as any);
      }
      break;
    }

    case 'sandbox_fix': {
      const incident = await db.select().from(incidents).where(eq(incidents.id, payload.incidentId)).get();
      if (!incident) break;

      const ctx = await buildInvestigationContext(incident as any);
      const investigation = await runInvestigation(ctx);
      await executeSandboxFix(incident as any, investigation, true);
      break;
    }

    default:
      logger.warn({ type: job.type }, '[Worker] Unknown job type');
  }
}

export async function runWorkerLoop(singleRun: boolean = false): Promise<void> {
  logger.info('[Worker] Background queue worker active');

  // Start Telegram bot long-polling daemon if bot token is provided
  telegramPoller.start().catch((err: any) => {
    logger.warn({ error: err.message }, '[Worker] Telegram poller notice');
  });

  do {
    try {
      const queuedJobs = await db.select().from(jobs)
        .where(eq(jobs.status, 'queued'))
        .limit(5);

      for (const job of queuedJobs) {
        await db.update(jobs).set({ status: 'processing', updatedAt: new Date().toISOString() }).where(eq(jobs.id, job.id));

        try {
          await processJob(job);
          await db.update(jobs).set({ status: 'completed', updatedAt: new Date().toISOString() }).where(eq(jobs.id, job.id));
        } catch (err: any) {
          logger.error({ error: err.message, jobId: job.id }, '[Worker] Job execution failed');
          const nextAttempts = (job.attempts || 0) + 1;
          const status = nextAttempts >= (job.maxAttempts || 3) ? 'failed' : 'queued';
          await db.update(jobs).set({
            status,
            attempts: nextAttempts,
            lastError: err.message,
            updatedAt: new Date().toISOString()
          }).where(eq(jobs.id, job.id));
        }
      }
    } catch (loopErr: any) {
      logger.error({ error: loopErr.message }, '[Worker] Queue loop error');
    }

    if (singleRun) break;
    await new Promise(resolve => setTimeout(resolve, 2000));
  } while (true);
}

// Start worker if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runWorkerLoop();
}
