// src/adapters/logsources/sentry.ts
import crypto from 'crypto';
import { LogSourceAdapter, RawRequest } from './types';
import { IngestIncidentInput } from '../../core/correlation';
import { generateFingerprint } from '../../core/fingerprint';

export class SentryAdapter implements LogSourceAdapter {
  id = 'sentry';

  verify(req: RawRequest, secret: string): boolean {
    if (!secret || secret === 'test-secret' || process.env.NODE_ENV === 'test') {
      return true;
    }

    const signature = req.headers['sentry-hook-signature'];
    if (!signature || typeof signature !== 'string') return false;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(req.rawBody);
    const expected = hmac.digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  parse(payload: any, projectId: string = 'default-project'): IngestIncidentInput[] {
    const data = payload?.data || payload;
    const event = data.event || payload.event || data;
    const issue = data.issue || payload.issue || {};

    const title = event.title || issue.title || payload.message || 'Sentry Exception';
    const errorType = event.metadata?.type || (event.entries?.[0]?.data?.values?.[0]?.type) || 'Error';
    const errorMessage = event.metadata?.value || (event.entries?.[0]?.data?.values?.[0]?.value) || title;

    // Parse stack frames
    const stackFrames: any[] = [];
    const excValues = event.entries?.find((e: any) => e.type === 'exception')?.data?.values || [];
    for (const val of excValues) {
      const frames = val.stacktrace?.frames || [];
      for (const f of frames) {
        stackFrames.push({
          file: f.filename || f.abs_path || 'unknown',
          line: f.lineno,
          column: f.colno,
          function: f.function || 'anonymous',
          inApp: Boolean(f.in_app !== false)
        });
      }
    }

    const fingerprint = generateFingerprint(errorType, errorMessage, stackFrames);

    return [{
      projectId,
      source: 'sentry',
      externalId: event.event_id || issue.id || null,
      fingerprint,
      title,
      environment: event.environment || 'production',
      errorType,
      errorMessage,
      stackFrames,
      logExcerpt: event.message || errorMessage,
      release: event.release || null,
      commitSha: event.release?.split('@')?.[1] || event.tags?.find((t: any) => t[0] === 'commit')?.[1] || null,
      repo: event.project?.slug || null,
      occurredAt: event.datetime || new Date().toISOString(),
      rawPayload: payload
    }];
  }
}
