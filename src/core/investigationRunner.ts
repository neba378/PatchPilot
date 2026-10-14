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
  const incident = await db.select().from(incidents).where(eq(incidents.id, incidentId)).get();
  if (!incident) return;

  await db.update(incidents).set({ status: 'diagnosing' }).where(eq(incidents.id, incident.id));

  try {
    const ctx = await buildInvestigationContext(incident as any);
    const investigation = await runInvestigation(ctx);

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

    const verification = await runVerifierPass(investigation);

    if (verification.shouldAbstain) {
      await db.update(incidents).set({
        status: 'abstained',
        severity: 'medium'
      }).where(eq(incidents.id, incident.id));
      logger.info({ incidentId: incident.id, reason: verification.abstainReason }, '[Investigation] Abstained');
    } else {
      await db.update(incidents).set({
        status: 'awaiting_approval'
      }).where(eq(incidents.id, incident.id));

      // Dispatch alert card with inline interactive action buttons to Telegram
      await telegramAdapter.sendAlert(incident as any);
      logger.info({ incidentId: incident.id }, '[Investigation] Awaiting human review; alert sent to Telegram');
    }

    if (jobId) {
      await db.update(jobs).set({
        status: 'completed',
        updatedAt: new Date().toISOString()
      }).where(eq(jobs.id, jobId));
    }
  } catch (err: any) {
    logger.error({ error: err.message, incidentId }, '[Investigation] Pipeline error');
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
  if (incident && incident.status !== 'abstained') {
    executeInvestigationForIncident(incident.id).catch((err: any) => {
      logger.error({ error: err.message, incidentId: incident.id }, '[InvestigationRunner] Background execution error');
    });
  }
}
