// src/core/correlation.ts
import { db } from '../db';
import { incidents, signals } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { Incident, RelatedSignalSchema } from './schemas';
import { triageIncident } from './triage';
import { logger } from './logger';
import { z } from 'zod';

type RelatedSignal = z.infer<typeof RelatedSignalSchema>;

export interface IngestIncidentInput {
  projectId: string;
  source: string;
  externalId?: string | null;
  fingerprint: string;
  title: string;
  environment?: string;
  errorType?: string | null;
  errorMessage?: string | null;
  stackFrames?: any[];
  logExcerpt?: string | null;
  release?: string | null;
  commitSha?: string | null;
  repo?: string | null;
  occurredAt?: string;
  rawPayload?: any;
}

/**
 * Correlates and deduplicates incoming signals:
 * 1. Matches same fingerprint within 24 hours -> increments occurrence count.
 * 2. Matches signals from different sources sharing commitSha, fingerprint, or file within 30 mins -> merges with relatedSignals.
 */
export async function correlateAndIngestSignal(input: IngestIncidentInput): Promise<{ incident: any; isNew: boolean }> {
  const occurredAt = input.occurredAt || new Date().toISOString();
  const now = new Date();

  // Record raw signal first
  const signalId = `SIG-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    await db.insert(signals).values({
      id: signalId,
      projectId: input.projectId,
      source: input.source,
      rawPayload: JSON.stringify(input.rawPayload || {}),
      receivedAt: now.toISOString()
    });
  } catch (err: any) {
    logger.warn({ error: err.message }, '[Correlation] Failed to save raw signal');
  }

  // Look for existing active incidents in this project
  const existingIncidents = await db.select().from(incidents)
    .where(eq(incidents.projectId, input.projectId))
    .orderBy(desc(incidents.detectedAt));

  for (const existing of existingIncidents) {
    const existingDate = new Date(existing.detectedAt);
    const diffMs = now.getTime() - existingDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffMins = diffMs / (1000 * 60);

    // Rule 1: Exact fingerprint match within 24 hours -> increment occurrence
    if (existing.fingerprint === input.fingerprint && diffHours <= 24) {
      const updatedOccurrences = (existing.occurrences || 1) + 1;
      let existingRelated: RelatedSignal[] = [];
      try {
        existingRelated = JSON.parse(existing.relatedSignals || '[]');
      } catch {}

      existingRelated.push({
        source: input.source,
        signalId,
        externalId: input.externalId || undefined,
        timestamp: now.toISOString()
      });

      await db.update(incidents)
        .set({
          occurrences: updatedOccurrences,
          relatedSignals: JSON.stringify(existingRelated)
        })
        .where(eq(incidents.id, existing.id));

      logger.info({ incidentId: existing.id, occurrences: updatedOccurrences }, '[Correlation] Merged into existing incident by fingerprint');
      return {
        incident: { ...existing, occurrences: updatedOccurrences, relatedSignals: JSON.stringify(existingRelated) },
        isNew: false
      };
    }

    // Rule 2: Multi-source correlation: different source, shared commit SHA within 30 minutes
    if (
      existing.source !== input.source &&
      input.commitSha &&
      existing.commitSha === input.commitSha &&
      diffMins <= 30
    ) {
      let existingRelated: RelatedSignal[] = [];
      try {
        existingRelated = JSON.parse(existing.relatedSignals || '[]');
      } catch {}

      existingRelated.push({
        source: input.source,
        signalId,
        externalId: input.externalId || undefined,
        timestamp: now.toISOString()
      });

      await db.update(incidents)
        .set({
          relatedSignals: JSON.stringify(existingRelated)
        })
        .where(eq(incidents.id, existing.id));

      logger.info({ incidentId: existing.id, commitSha: input.commitSha }, '[Correlation] Correlated cross-source incident by commitSha');
      return {
        incident: { ...existing, relatedSignals: JSON.stringify(existingRelated) },
        isNew: false
      };
    }
  }

  // Otherwise, create brand new incident
  const triage = triageIncident({
    errorMessage: input.errorMessage,
    errorType: input.errorType,
    logExcerpt: input.logExcerpt,
    environment: input.environment,
    occurrences: 1
  });

  const newIncidentId = `INC-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  const initialRelated: RelatedSignal[] = [{
    source: input.source,
    signalId,
    externalId: input.externalId || undefined,
    timestamp: now.toISOString()
  }];

  const newIncident = {
    id: newIncidentId,
    projectId: input.projectId,
    source: input.source,
    externalId: input.externalId || null,
    fingerprint: input.fingerprint,
    title: input.title,
    severity: triage.severity,
    category: triage.category,
    status: triage.shouldAttemptFix ? 'new' : 'abstained',
    environment: input.environment || 'production',
    errorType: input.errorType || null,
    errorMessage: input.errorMessage || null,
    stackFrames: JSON.stringify(input.stackFrames || []),
    logExcerpt: input.logExcerpt || null,
    release: input.release || null,
    commitSha: input.commitSha || null,
    repo: input.repo || null,
    occurredAt,
    detectedAt: now.toISOString(),
    occurrences: 1,
    relatedSignals: JSON.stringify(initialRelated)
  };

  await db.insert(incidents).values(newIncident);
  logger.info({ incidentId: newIncidentId, category: triage.category, status: newIncident.status }, '[Correlation] Created new incident');

  return { incident: newIncident, isNew: true };
}
