// src/policy/auditLog.ts
import { db } from '../db';
import { auditLog } from '../db/schema';
import { logger } from '../core/logger';

export interface AuditEntryInput {
  projectId?: string;
  actor: string;
  action: string;
  inputsSummary: string;
  decision: 'allow' | 'deny' | 'needs_approval';
  result?: string;
}

export async function recordAudit(entry: AuditEntryInput): Promise<void> {
  const id = `AUD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const timestamp = new Date().toISOString();

  try {
    await db.insert(auditLog).values({
      id,
      projectId: entry.projectId || null,
      timestamp,
      actor: entry.actor,
      action: entry.action,
      inputsSummary: entry.inputsSummary,
      decision: entry.decision,
      result: entry.result || null
    });
    logger.debug({ auditId: id, action: entry.action, decision: entry.decision }, '[AuditLog] Recorded entry');
  } catch (err: any) {
    logger.error({ error: err.message }, '[AuditLog] Failed to persist audit entry');
  }
}
