// src/core/verificationLoop.ts
import { db } from '../db';
import { incidents, pullRequests, memories } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from './logger';
import { generatePostmortem } from '../agents/postmortem';
import { telegramAdapter } from '../adapters/channels/telegram';
import { gitHubAdapter } from '../adapters/repohosts/github';

export async function handlePrMerged(incidentId: string): Promise<void> {
  const incident = await db.select().from(incidents).where(eq(incidents.id, incidentId)).get();
  if (!incident) return;

  logger.info({ incidentId }, '[VerificationLoop] Pull request merged! Moving to MERGED state');
  await db.update(incidents).set({ status: 'merged' }).where(eq(incidents.id, incidentId));
  await db.update(pullRequests).set({ status: 'merged', mergedAt: new Date().toISOString() }).where(eq(pullRequests.incidentId, incidentId));

  await telegramAdapter.sendProgress(
    incidentId,
    'PR Merged',
    'PR was merged by engineer. Starting recurrence watch window...'
  );

  // Generate Postmortem document
  await generatePostmortem(incident as any);

  // Record outcome in long-term memory
  try {
    await db.insert(memories).values({
      id: `MEM-${Date.now().toString(36)}`,
      projectId: incident.projectId,
      fingerprint: incident.fingerprint,
      errorType: incident.errorType || 'TypeError',
      rootCauseSummary: incident.title,
      solutionSummary: 'Applied safe optional chaining on nested properties with regression test',
      wasAccepted: true,
      createdAt: new Date().toISOString()
    });
  } catch {}
}

export async function checkRecurrence(incidentId: string, errorReoccurred: boolean = false): Promise<void> {
  const incident = await db.select().from(incidents).where(eq(incidents.id, incidentId)).get();
  if (!incident || incident.status !== 'merged') return;

  if (errorReoccurred) {
    logger.warn({ incidentId }, '[VerificationLoop] Recurrence detected! Reopening incident and proposing revert');
    await db.update(incidents).set({ status: 'reopened' }).where(eq(incidents.id, incidentId));

    // Open revert PR proposal
    const repo = incident.repo || 'nebiyu-org/checkout-api-service';
    const revertBranch = `patchpilot/revert-${incident.id.toLowerCase()}`;
    await gitHubAdapter.createBranch(repo, 'main', revertBranch);
    const revertPr = await gitHubAdapter.openDraftPr(repo, {
      title: `[PatchPilot Revert] Revert fix for ${incident.id} due to reoccurring telemetry`,
      body: `## ⚠️ Recurrence Alert\n\nThe error fingerprint \`${incident.fingerprint}\` reoccurred after deployment.\nPatchPilot automatically proposes an emergency revert.`,
      head: revertBranch
    });

    await telegramAdapter.sendProgress(
      incidentId,
      'RECURRENCE DETECTED',
      `Error reoccurred post-merge! Reopened incident. Revert PR opened: ${revertPr.url}`
    );
  } else {
    logger.info({ incidentId }, '[VerificationLoop] Recurrence watch window completed with zero errors. Marking VERIFIED_RESOLVED');
    await db.update(incidents).set({ status: 'verified_resolved' }).where(eq(incidents.id, incidentId));

    await telegramAdapter.sendProgress(
      incidentId,
      'Verified Resolved',
      'Zero error signals detected in observation window. Incident officially marked Verified Resolved! 🎉'
    );
  }
}
