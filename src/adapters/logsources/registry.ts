// src/adapters/logsources/registry.ts
import { LogSourceAdapter } from './types';
import { SentryAdapter } from './sentry';
import { GitHubActionsAdapter } from './githubActions';
import { GenericWebhookAdapter } from './genericWebhook';

class LogSourceRegistry {
  private adapters: Map<string, LogSourceAdapter> = new Map();

  constructor() {
    // Built-in adapters registered here (Adding an adapter is one new file + one line here!)
    this.register(new SentryAdapter());
    this.register(new GitHubActionsAdapter());
    this.register(new GenericWebhookAdapter());
  }

  register(adapter: LogSourceAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): LogSourceAdapter | undefined {
    return this.adapters.get(id);
  }

  list(): LogSourceAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export const logSourceRegistry = new LogSourceRegistry();
