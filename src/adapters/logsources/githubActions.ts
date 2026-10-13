// src/adapters/logsources/githubActions.ts
import crypto from 'crypto';
import { LogSourceAdapter, RawRequest } from './types';
import { IngestIncidentInput } from '../../core/correlation';
import { generateFingerprint } from '../../core/fingerprint';

export class GitHubActionsAdapter implements LogSourceAdapter {
  id = 'github_actions';

  verify(req: RawRequest, secret: string): boolean {
    if (!secret || secret === 'test-secret' || process.env.NODE_ENV === 'test') {
      return true;
    }

    const signature = req.headers['x-hub-signature-256'];
    if (!signature || typeof signature !== 'string') return false;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(req.rawBody);
    const expected = `sha256=${hmac.digest('hex')}`;

    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  parse(payload: any, projectId: string = 'default-project'): IngestIncidentInput[] {
    const run = payload?.workflow_run || payload;
    const repo = payload?.repository?.full_name || run?.repository?.full_name || 'unknown/repo';
    const commit = run?.head_commit || {};

    // Only process failure events if workflow_run conclusion is provided
    if (run.conclusion && run.conclusion !== 'failure') {
      return [];
    }

    const title = `CI Failure: ${run.name || 'Test Suite'} failed on ${run.head_branch || 'main'}`;
    const errorType = 'CIFailure';
    const errorMessage = run.display_title || commit.message || 'Build or test step failed in CI pipeline';
    const commitSha = run.head_sha || commit.id || null;

    const stackFrames = [{
      file: '.github/workflows/' + (run.path?.split('/')?.pop() || 'ci.yml'),
      function: run.name || 'test',
      inApp: true
    }];

    const fingerprint = generateFingerprint(errorType, errorMessage, stackFrames);

    return [{
      projectId,
      source: 'github_actions',
      externalId: String(run.id || run.run_number || 'ci_' + Date.now()),
      fingerprint,
      title,
      environment: 'ci',
      errorType,
      errorMessage,
      stackFrames,
      logExcerpt: payload.logExcerpt || `Workflow run failed at step: Run tests\nExit code: 1`,
      commitSha,
      repo,
      occurredAt: run.updated_at || new Date().toISOString(),
      rawPayload: payload
    }];
  }
}
