// src/policy/engine.ts
import { recordAudit } from './auditLog';
import { logger } from '../core/logger';

export type PolicyAction =
  | 'read_file'
  | 'search_code'
  | 'create_sandbox'
  | 'run_command'
  | 'write_branch'
  | 'open_pr'
  | 'merge_pr'
  | 'deploy_code'
  | 'post_message';

export interface PolicyContext {
  projectId?: string;
  actor: string;
  path?: string;
  command?: string;
  changedFilesCount?: number;
  changedLinesCount?: number;
  humanApproved?: boolean;
  consecutiveIdenticalCalls?: number;
}

export interface PolicyCheckResult {
  decision: 'allow' | 'deny' | 'needs_approval';
  reason: string;
}

const DEFAULT_PROTECTED_PATHS = [
  'migrations/',
  'infra/',
  '.github/workflows/',
  'security/',
  '.env',
  'config/secrets'
];

export class PolicyEngine {
  private protectedPaths: string[] = DEFAULT_PROTECTED_PATHS;
  private circuitBreakerTripped: boolean = false;

  constructor(customProtectedPaths?: string[]) {
    if (customProtectedPaths) {
      this.protectedPaths = customProtectedPaths;
    }
  }

  public tripCircuitBreaker(reason: string): void {
    this.circuitBreakerTripped = true;
    logger.warn({ reason }, '[PolicyEngine] Circuit breaker TRIPPED');
  }

  public resetCircuitBreaker(): void {
    this.circuitBreakerTripped = false;
  }

  public async check(action: PolicyAction, ctx: PolicyContext): Promise<PolicyCheckResult> {
    const summary = `${action} requested by ${ctx.actor} on ${ctx.path || ctx.command || 'resource'}`;

    // 0. Circuit breaker check
    if (this.circuitBreakerTripped) {
      const result: PolicyCheckResult = {
        decision: 'deny',
        reason: 'Circuit breaker is tripped due to previous budget or loop violations.'
      };
      await recordAudit({ ...ctx, action, inputsSummary: summary, decision: result.decision, result: result.reason });
      return result;
    }

    // 1. Tool loop check: if the same tool call repeated 3+ times, trip circuit breaker
    if (ctx.consecutiveIdenticalCalls && ctx.consecutiveIdenticalCalls >= 3) {
      this.tripCircuitBreaker('Repetitive tool call loop detected (3+ identical calls)');
      const result: PolicyCheckResult = {
        decision: 'deny',
        reason: 'Execution loop detected: repetitive identical tool calls.'
      };
      await recordAudit({ ...ctx, action, inputsSummary: summary, decision: result.decision, result: result.reason });
      return result;
    }

    // 2. HARD INVARIANT: System NEVER merges or deploys code autonomously under ANY circumstance
    if (action === 'merge_pr' || action === 'deploy_code') {
      const result: PolicyCheckResult = {
        decision: 'deny',
        reason: 'HARD INVARIANT VIOLATION: PatchPilot agent is strictly forbidden from merging PRs or deploying code.'
      };
      await recordAudit({ ...ctx, action, inputsSummary: summary, decision: result.decision, result: result.reason });
      return result;
    }

    // 3. HARD INVARIANT: Modifying repository (write_branch, open_pr) requires explicit human approval
    if ((action === 'write_branch' || action === 'open_pr') && !ctx.humanApproved) {
      const result: PolicyCheckResult = {
        decision: 'needs_approval',
        reason: 'Human approval is strictly required before writing code changes to repository.'
      };
      await recordAudit({ ...ctx, action, inputsSummary: summary, decision: result.decision, result: result.reason });
      return result;
    }

    // 4. Protected Paths Check
    if (ctx.path) {
      const normalizedPath = ctx.path.replace(/^\/+/, '');
      const isProtected = this.protectedPaths.some(protectedPattern => {
        const cleanPattern = protectedPattern.replace(/\/\*\*?$/, '').replace(/^\/+/, '');
        return normalizedPath.startsWith(cleanPattern) || normalizedPath.includes(cleanPattern);
      });

      if (isProtected) {
        const result: PolicyCheckResult = {
          decision: 'deny',
          reason: `Access to protected path '${ctx.path}' is forbidden by project security policy.`
        };
        await recordAudit({ ...ctx, action, inputsSummary: summary, decision: result.decision, result: result.reason });
        return result;
      }
    }

    // 5. Patch Size limits check (at most 3 files and 60 lines changed)
    if (ctx.changedFilesCount && ctx.changedFilesCount > 3) {
      const result: PolicyCheckResult = {
        decision: 'deny',
        reason: `Patch exceeds maximum allowed changed files (${ctx.changedFilesCount} > 3).`
      };
      await recordAudit({ ...ctx, action, inputsSummary: summary, decision: result.decision, result: result.reason });
      return result;
    }

    if (ctx.changedLinesCount && ctx.changedLinesCount > 60) {
      const result: PolicyCheckResult = {
        decision: 'deny',
        reason: `Patch exceeds maximum allowed changed lines (${ctx.changedLinesCount} > 60).`
      };
      await recordAudit({ ...ctx, action, inputsSummary: summary, decision: result.decision, result: result.reason });
      return result;
    }

    // 6. Default allow for read / search operations
    const result: PolicyCheckResult = {
      decision: 'allow',
      reason: 'Action passed all security policies.'
    };
    await recordAudit({ ...ctx, action, inputsSummary: summary, decision: result.decision, result: result.reason });
    return result;
  }
}

export const policyEngine = new PolicyEngine();
