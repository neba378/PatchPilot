// src/adapters/sandboxes/registry.ts
import { SandboxProvider } from './types';
import { FakeSandboxProvider } from './fake';
import { LocalDockerSandboxProvider } from './localDocker';

class SandboxRegistry {
  private providers: Map<string, SandboxProvider> = new Map();

  constructor() {
    this.register(new FakeSandboxProvider());
    this.register(new LocalDockerSandboxProvider());
  }

  register(provider: SandboxProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): SandboxProvider {
    return this.providers.get(id) || this.providers.get('fake')!;
  }
}

export const sandboxRegistry = new SandboxRegistry();
