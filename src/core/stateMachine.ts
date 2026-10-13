// src/core/stateMachine.ts
import { IncidentStatus } from './schemas';

export class InvalidStateTransitionError extends Error {
  constructor(public fromStatus: IncidentStatus, public toStatus: IncidentStatus) {
    super(`Illegal state transition from '${fromStatus}' to '${toStatus}'`);
    this.name = 'InvalidStateTransitionError';
  }
}

const LEGAL_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  new: ['diagnosing', 'abstained'],
  diagnosing: ['awaiting_approval', 'abstained'],
  awaiting_approval: ['fixing', 'snoozed', 'rejected', 'abstained'],
  snoozed: ['awaiting_approval', 'fixing', 'rejected'],
  rejected: ['reopened'],
  fixing: ['validating', 'fix_failed'],
  validating: ['pr_open', 'fix_failed'],
  pr_open: ['merged', 'rejected'],
  merged: ['verified_resolved', 'reopened'],
  verified_resolved: ['reopened'],
  reopened: ['diagnosing', 'fixing'],
  abstained: ['reopened'],
  fix_failed: ['awaiting_approval', 'fixing', 'rejected']
};

export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  if (from === to) return true;
  const allowed = LEGAL_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

export function assertTransition(from: IncidentStatus, to: IncidentStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}
