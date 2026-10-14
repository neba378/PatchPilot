// src/core/investigationRunner.ts
import { db } from '../db';
import { incidents, investigations, jobs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from './logger';
import { buildInvestigationContext } from './contextBuilder';
import { runInvestigation } from '../agents/investigator';
import { runVerifierPass } from '../agents/verifier';
import { telegramAdapter } from '../adapters/channels/telegram';

export async function executeInvestigationForIncident(incidentId: string, jobId?: string): Promise<void> {
  const startTime = Date.now();
  logger.info({ incidentId, jobId }, '🔍 [InvestigationRunner] Starting autonomous investigation pipeline');

  const incident = await db.select().from(incidents).where(eq(incidents.id, incidentId)).get();
  if (!incident) {
    logger.warn({ incidentId }, '[InvestigationRunner] Incident not found in database. Aborting investigation');
    return;
  }

  logger.debug({ incidentId, currentStatus: incident.status, title: incident.title }, '[InvestigationRunner] Transitioning incident to "diagnosing"');
  await db.update(incidents).set({ status: 'diagnosing' }).where(eq(incidents.id, incident.id));

  try {
    logger.debug({ incidentId }, '[InvestigationRunner] Building investigation context from incident telemetry & codebase');
    const ctx = await buildInvestigationContext(incident as any);
    logger.debug({
      incidentId,
      suspectFile: ctx.fileExcerpts[0]?.path,
      environment: ctx.incident.environment,
      commitSha: ctx.incident.commitSha,
      codeContextLength: ctx.fileExcerpts.reduce((acc, f) => acc + f.lines.length, 0)
    }, '[InvestigationRunner] Investigation context assembled');

    logger.info({ incidentId }, '🤖 [InvestigationRunner] Invoking AI Investigator (competing hypotheses & root causes)');
    const investigation = await runInvestigation(ctx);
    logger.info({
      incidentId,
      confidenceScore: investigation.confidenceScore,
      hypothesesCount: investigation.hypotheses.length,
      rootCauses: investigation.rootCauses,
      affectedFiles: investigation.affectedFiles
    }, '🔬 [InvestigationRunner] AI Investigation completed');

    // Persist investigation to database
    const invId = `INV-${Date.now().toString(36)}`;
    await db.insert(investigations).values({
      id: invId,
      incidentId: incident.id,
      hypotheses: JSON.stringify(investigation.hypotheses),
      rootCauses: JSON.stringify(investigation.rootCauses),
      affectedFiles: JSON.stringify(investigation.affectedFiles),
      confidenceScore: investigation.confidenceScore,
      createdAt: new Date().toISOString()
    });
    logger.debug({ invId, incidentId }, '[InvestigationRunner] Persisted investigation record to database');

    logger.debug({ incidentId }, '⚖️ [InvestigationRunner] Running adversarial verifier pass');
    const verification = await runVerifierPass(investigation);
    logger.debug({ incidentId, verification }, '[InvestigationRunner] Verifier pass outcome');

    if (verification.shouldAbstain) {
      await db.update(incidents).set({
        status: 'abstained',
        severity: 'medium'
      }).where(eq(incidents.id, incident.id));
      logger.info({ incidentId: incident.id, reason: verification.abstainReason }, '🛑 [InvestigationRunner] Investigation abstained (uncertainty guardrail)');
    } else {
      await db.update(incidents).set({
        status: 'awaiting_approval'
      }).where(eq(incidents.id, incident.id));
      logger.info({ incidentId: incident.id }, '✅ [InvestigationRunner] Verified with high confidence. Transitioned to "awaiting_approval"');

      // Dispatch alert card with inline interactive action buttons to Telegram
      try {
        await telegramAdapter.sendAlert(incident as any);
        logger.info({ incidentId: incident.id }, '📬 [InvestigationRunner] Alert card dispatched to Telegram channel');
      } catch (tgErr: any) {
        logger.warn({ incidentId: incident.id, error: tgErr.message }, '[InvestigationRunner] Telegram dispatch notice (may be unconfigured in dev)');
      }
    }

    if (jobId) {
      await db.update(jobs).set({
        status: 'completed',
        updatedAt: new Date().toISOString()
      }).where(eq(jobs.id, jobId));
      logger.debug({ jobId }, '[InvestigationRunner] Marked queue job as completed');
    }

    const duration = Date.now() - startTime;
    logger.info({ incidentId, durationMs: duration }, '🏁 [InvestigationRunner] Investigation pipeline completed successfully');
  } catch (err: any) {
    logger.error({ error: err.message, stack: err.stack, incidentId }, '❌ [InvestigationRunner] Pipeline execution error');
    if (jobId) {
      await db.update(jobs).set({
        status: 'failed',
        lastError: err.message,
        updatedAt: new Date().toISOString()
      }).where(eq(jobs.id, jobId));
    }
  }
}

export function triggerBackgroundInvestigation(incident: any, isNew?: boolean): void {
  logger.debug({ incidentId: incident?.id, status: incident?.status, isNew }, '[InvestigationRunner] triggerBackgroundInvestigation called');
  if (incident && incident.status !== 'abstained') {
    executeInvestigationForIncident(incident.id).catch((err: any) => {
      logger.error({ error: err.message, stack: err.stack, incidentId: incident.id }, '[InvestigationRunner] Background execution error');
    });
  }
}
