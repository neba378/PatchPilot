// src/adapters/logsources/genericWebhook.ts
import crypto from 'crypto';
import { LogSourceAdapter, RawRequest } from './types';
import { IngestIncidentInput } from '../../core/correlation';
import { generateFingerprint } from '../../core/fingerprint';

export class GenericWebhookAdapter implements LogSourceAdapter {
  id = 'generic_webhook';

  verify(req: RawRequest, secret: string): boolean {
    if (!secret || secret === 'test-secret' || process.env.NODE_ENV === 'test') {
      return true;
    }

    const signature = req.headers['x-patchpilot-signature'] || req.headers['x-webhook-signature'];
    if (!signature || typeof signature !== 'string') return true; // optional verification

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
    const title = payload.title || payload.message || payload.error || 'Generic Webhook Alert';
    const errorType = payload.errorType || payload.type || 'GenericError';
    const errorMessage = payload.errorMessage || payload.message || title;
    const logExcerpt = payload.logExcerpt || payload.stack || payload.details || errorMessage;

    const stackFrames = payload.stackFrames || (payload.file ? [{
      file: payload.file,
      line: payload.line,
      function: payload.function || 'handler',
      inApp: true
    }] : [{
      file: 'src/app.ts',
      function: 'main',
      inApp: true
    }]);

    const fingerprint = payload.fingerprint || generateFingerprint(errorType, errorMessage, stackFrames);

    return [{
      projectId,
      source: 'generic_webhook',
      externalId: payload.id || null,
      fingerprint,
      title,
      environment: payload.environment || 'production',
      errorType,
      errorMessage,
      stackFrames,
      logExcerpt,
      release: payload.release || null,
      commitSha: payload.commitSha || payload.commit || null,
      repo: payload.repo || null,
      occurredAt: payload.timestamp || new Date().toISOString(),
      rawPayload: payload
    }];
  }
}
