// src/core/triage.ts
import { IncidentCategory, IncidentSeverity } from './schemas';

export interface TriageInput {
  errorMessage?: string | null;
  errorType?: string | null;
  logExcerpt?: string | null;
  environment?: string;
  occurrences?: number;
}

export interface TriageResult {
  category: IncidentCategory;
  severity: IncidentSeverity;
  shouldAttemptFix: boolean;
  abstainReason?: string;
}

export function triageIncident(input: TriageInput): TriageResult {
  const combinedText = `${input.errorType || ''} ${input.errorMessage || ''} ${input.logExcerpt || ''}`.toLowerCase();

  let category: IncidentCategory = 'code_bug';
  let shouldAttemptFix = true;
  let abstainReason: string | undefined;

  // 1. Infrastructure checks
  if (
    combinedText.includes('econnreset') ||
    combinedText.includes('econnrefused') ||
    combinedText.includes('etimedout') ||
    combinedText.includes('socket hang up') ||
    combinedText.includes('gateway timeout') ||
    combinedText.includes('502 bad gateway') ||
    combinedText.includes('504 gateway time-out') ||
    combinedText.includes('dns lookup failed') ||
    combinedText.includes('rate limit') ||
    combinedText.includes('too many requests')
  ) {
    category = 'infrastructure';
    shouldAttemptFix = false;
    abstainReason = 'Transient network/infrastructure error or rate limit detected. Code patching abstained.';
  }
  // 2. Configuration & Missing Env Vars
  else if (
    combinedText.includes('missing environment variable') ||
    combinedText.includes('process.env.') ||
    combinedText.includes('config key not found') ||
    combinedText.includes('invalid credentials') ||
    combinedText.includes('authentication failed')
  ) {
    category = 'config';
    shouldAttemptFix = false;
    abstainReason = 'Configuration or missing environment variable issue. Manual secret/env provisioning required.';
  }
  // 3. Dependencies & Missing Modules
  else if (
    combinedText.includes('cannot find module') ||
    combinedText.includes('modulenotfounderror') ||
    combinedText.includes('package not installed') ||
    combinedText.includes('peer dependency missing')
  ) {
    category = 'dependency';
    shouldAttemptFix = false;
    abstainReason = 'Unresolved upstream package dependency. Manual lockfile/dependency resolution required.';
  }
  // 4. Flaky test pattern
  else if (
    combinedText.includes('timed out waiting for element') ||
    combinedText.includes('assertion error: expected true to be false') && combinedText.includes('retry')
  ) {
    category = 'flaky_test';
    shouldAttemptFix = false;
    abstainReason = 'Test suite flakiness or asynchronous timing issue detected. Abstaining from code mutation.';
  }
  // 5. Code Bug (TypeError, ReferenceError, Null Pointer, SyntaxError, logic failure)
  else {
    category = 'code_bug';
    shouldAttemptFix = true;
  }

  // Calculate severity
  const env = (input.environment || 'production').toLowerCase();
  const occurrences = input.occurrences || 1;

  let severity: IncidentSeverity = 'medium';

  if (env === 'production') {
    if (occurrences > 10 || combinedText.includes('fatal') || combinedText.includes('panic') || combinedText.includes('cannot read propert')) {
      severity = 'critical';
    } else {
      severity = 'high';
    }
  } else if (env === 'staging') {
    severity = occurrences > 5 ? 'high' : 'medium';
  } else {
    severity = 'low';
  }

  return {
    category,
    severity,
    shouldAttemptFix,
    abstainReason
  };
}
