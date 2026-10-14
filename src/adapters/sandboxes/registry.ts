// src/adapters/sandboxes/registry.ts
import { SandboxProvider } from './types';
import { FakeSandboxProvider } from './fake';
import { LocalDockerSandboxProvider } from './localDocker';
import { E2BSandboxProvider } from './e2b';
import { ModalSandboxProvider } from './modal';

export interface SandboxProviderInfo {
  id: string;
  name: string;
  type: 'local' | 'cloud' | 'mock';
  description: string;
  isDefault?: boolean;
}

class SandboxRegistry {
  private providers: Map<string, SandboxProvider> = new Map();

  constructor() {
    this.register(new FakeSandboxProvider());
    this.register(new LocalDockerSandboxProvider());
    this.register(new E2BSandboxProvider());
    this.register(new ModalSandboxProvider());
  }

  register(provider: SandboxProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): SandboxProvider {
    return this.providers.get(id) || this.providers.get('local-docker') || this.providers.get('fake')!;
  }

  list(): SandboxProviderInfo[] {
    return [
      {
        id: 'local-docker',
        name: 'Local Docker',
        type: 'local',
        description: 'Default local container environment with filesystem isolation.',
        isDefault: true
      },
      {
        id: 'e2b',
        name: 'E2B Sandbox (3rd Party Cloud)',
        type: 'cloud',
        description: 'Secure, sandboxed cloud microVM purpose-built for AI code execution.'
      },
      {
        id: 'modal',
        name: 'Modal Labs (3rd Party Cloud)',
        type: 'cloud',
        description: 'Serverless cloud container infrastructure with elastic compute.'
      },
      {
        id: 'fake',
        name: 'In-Memory Simulation',
        type: 'mock',
        description: 'Offline mock sandbox for fast simulation and dry testing.'
      }
    ];
  }
}

export const sandboxRegistry = new SandboxRegistry();
