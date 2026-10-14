// src/adapters/sandboxes/fake.ts
import { Sandbox, SandboxProvider, SandboxCreateOptions, ExecResult } from './types';
import { logger } from '../../core/logger';

export class FakeSandbox implements Sandbox {
  public id: string;
  private files: Map<string, string> = new Map();
  public isDestroyed: boolean = false;

  constructor(id: string, initialFiles?: Record<string, string>) {
    this.id = id;
    if (initialFiles) {
      for (const [k, v] of Object.entries(initialFiles)) {
        this.files.set(k, v);
      }
    }
  }

  async exec(command: string, opts?: { cwd?: string; env?: Record<string, string> }): Promise<ExecResult> {
    if (this.isDestroyed) {
      throw new Error('Cannot execute command in destroyed sandbox');
    }

    const cmd = command.trim();

    // 1. Simulation of reproducing the failure on original unpatched file
    if (cmd.includes('paymentController.test') || cmd.includes('regression.test')) {
      const code = this.files.get('src/controllers/paymentController.ts') || '';
      
      // If code still contains the unpatched direct access:
      if (code.includes('metadata.billingDetails.postalCode') && !code.includes('metadata?.') && !code.includes('metadata = {}')) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: `FAIL src/controllers/__tests__/paymentController.test.ts\nTypeError: Cannot read properties of undefined (reading 'billingDetails')\n  at handleCheckout (src/controllers/paymentController.ts:10:33)`
        };
      } else {
        // Fix was applied!
        return {
          exitCode: 0,
          stdout: `PASS src/controllers/__tests__/paymentController.test.ts\nPASS src/controllers/__tests__/regression.test.ts\nTests: 2 passed, 2 total`,
          stderr: ''
        };
      }
    }

    // 2. Linter simulation
    if (cmd.includes('eslint') || cmd.includes('lint')) {
      return { exitCode: 0, stdout: 'Lint passed: 0 errors, 0 warnings', stderr: '' };
    }

    // 3. Typecheck simulation
    if (cmd.includes('tsc') || cmd.includes('typecheck')) {
      return { exitCode: 0, stdout: 'TypeScript compilation successful', stderr: '' };
    }

    // 4. Default success for npm install, etc.
    return { exitCode: 0, stdout: `Executed: ${cmd}`, stderr: '' };
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    this.files.set(filePath, content);
  }

  async readFile(filePath: string): Promise<string> {
    const val = this.files.get(filePath);
    if (val === undefined) {
      throw new Error(`File not found: ${filePath}`);
    }
    return val;
  }

  async destroy(): Promise<void> {
    this.isDestroyed = true;
    this.files.clear();
    logger.debug({ sandboxId: this.id }, '[FakeSandbox] Destroyed successfully');
  }
}

export class FakeSandboxProvider implements SandboxProvider {
  id = 'fake';

  async create(opts: SandboxCreateOptions): Promise<Sandbox> {
    const id = `sbx-fake-${Date.now().toString(36)}`;
    return new FakeSandbox(id, opts.files);
  }
}
