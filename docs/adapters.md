# PatchPilot Adapter Architecture & Extension Guide

PatchPilot is built from first principles on **vendor-neutral abstractions**. Every monitoring platform, log source, repository host, sandbox provider, and communication channel connects through lightweight, strictly typed adapters.

Adding support for any new third-party system requires **only one new adapter file plus one line in the corresponding registry**.

---

## 1. LogSource Adapters

### The Interface
```typescript
export interface LogSourceAdapter {
  id: string;
  verify(req: RawRequest, secret: string): boolean;
  parse(payload: unknown, projectId?: string): IngestIncidentInput[];
  poll?(conn: any, since: Date): Promise<IngestIncidentInput[]>;
}
```

### Worked Example: Adding Datadog LogSource in 2 Steps

#### Step 1: Create `src/adapters/logsources/datadog.ts`
```typescript
import { LogSourceAdapter, RawRequest } from './types';
import { IngestIncidentInput } from '../../core/correlation';
import { generateFingerprint } from '../../core/fingerprint';

export class DatadogAdapter implements LogSourceAdapter {
  id = 'datadog';

  verify(req: RawRequest, secret: string): boolean {
    const token = req.headers['x-datadog-webhook-token'];
    return Boolean(token && token === secret);
  }

  parse(payload: any, projectId: string = 'default'): IngestIncidentInput[] {
    const alert = payload.alert || payload;
    const title = alert.title || 'Datadog Monitor Alert';
    const errorType = alert.tags?.error_type || 'DatadogError';
    const errorMessage = alert.body || title;

    const stackFrames = [{
      file: alert.tags?.service_file || 'src/server.ts',
      function: alert.tags?.service_function || 'handler',
      inApp: true
    }];

    return [{
      projectId,
      source: 'datadog',
      externalId: alert.id,
      fingerprint: generateFingerprint(errorType, errorMessage, stackFrames),
      title,
      environment: alert.tags?.env || 'production',
      errorType,
      errorMessage,
      stackFrames,
      logExcerpt: alert.snapshot_logs || errorMessage,
      commitSha: alert.tags?.git_sha || null,
      repo: alert.tags?.repository || null,
      occurredAt: new Date(alert.date * 1000).toISOString(),
      rawPayload: payload
    }];
  }
}
```

#### Step 2: Register in `src/adapters/logsources/registry.ts`
```typescript
import { DatadogAdapter } from './datadog';

// In constructor:
this.register(new DatadogAdapter()); // <-- That's it!
```

---

## 2. Sandbox Providers

Supported providers:
- `fake`: Deterministic, ultra-fast in-memory sandbox for tests and CI.
- `local-docker`: Isolated temporary directories on the local machine with container isolation.
- `sandbank`: Daytona / E2B provider wrapper via `@sandbank.dev/core`.

---

## 3. Communication Channels

Supported channels:
- `telegram`: Push notifications and interactive inline button callbacks (`View Details`, `Accept & Patch`, `Reject`, `Snooze`).
- `slack` & `discord`: Webhook integration stubs.
