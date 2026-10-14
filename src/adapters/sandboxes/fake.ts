// src/adapters/sandboxes/fake.ts
import { Sandbox, SandboxProvider, SandboxCreateOptions, ExecResult } from './types';
import { logger } from '../../core/logger';
import fs from 'fs';
import path from 'path';

export class FakeSandbox implements Sandbox {
  public id: string;
  private files: Map<string, string> = new Map();
  public isDestroyed: boolean = false;

  constructor(id: string, initialFiles?: Record<string, string>) {
    this.id = id;
    if (initialFiles && Object.keys(initialFiles).length > 0) {
      for (const [k, v] of Object.entries(initialFiles)) {
        this.files.set(k, v);
      }
    } else {
      // Default fallback to fixture files if no files were loaded from git
      try {
        const fixtureDir = path.join(process.cwd(), 'fixtures', 'demo-app');
        if (fs.existsSync(fixtureDir)) {
          const loadDir = (dir: string, base: string = '') => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const rel = base ? `${base}/${entry.name}` : entry.name;
              const full = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                loadDir(full, rel);
              } else {
                this.files.set(rel, fs.readFileSync(full, 'utf-8'));
              }
            }
          };
          loadDir(fixtureDir);
        }
      } catch (e: any) {
        logger.warn({ error: e.message }, '[FakeSandbox] Could not load demo-app fixtures');
      }
    }
  }

  async exec(command: string, opts?: { cwd?: string; env?: Record<string, string> }): Promise<ExecResult> {
    if (this.isDestroyed) {
      throw new Error('Cannot execute command in destroyed sandbox');
    }

    const cmd = command.trim();

    // 1. Simulation of test suite execution
    if (cmd.includes('test') || cmd.includes('vitest') || cmd.includes('jest')) {
      // Check all controller / payment files for unpatched exceptions
      let hasUnpatchedBilling = false;
      let hasUnpatchedReasonCode = false;

      for (const [filePath, content] of this.files.entries()) {
        if (filePath.includes('paymentController') || filePath.includes('checkout') || filePath.includes('controller')) {
          // Check for unpatched billingDetails bug
          if (
            content.includes('.billingDetails.postalCode') &&
            !content.includes('billingDetails?.postalCode') &&
            !content.includes('metadata?.billingDetails')
          ) {
            hasUnpatchedBilling = true;
          }

          // Check for unpatched code bug
          if (
            content.includes('.code.toUpperCase()') &&
            !content.includes('reason?.code') &&
            !content.includes('.code?.toUpperCase()')
          ) {
            hasUnpatchedReasonCode = true;
          }
        }
      }

      const regEntry = Array.from(this.files.entries()).find(([k]) => k.includes('regression.test'));
      const targetsReasonCode = regEntry && (regEntry[1].includes('reason') || regEntry[1].includes('Refund') || regEntry[1].includes('Reason Code'));
      const targetsBilling = regEntry && (regEntry[1].includes('billingDetails') || regEntry[1].includes('postalCode') || regEntry[1].includes('Checkout'));

      const isFailing = regEntry
        ? (targetsReasonCode ? hasUnpatchedReasonCode : (targetsBilling ? hasUnpatchedBilling : (hasUnpatchedBilling || hasUnpatchedReasonCode)))
        : (hasUnpatchedBilling || hasUnpatchedReasonCode);

      if (isFailing) {
        if (targetsReasonCode || (!hasUnpatchedBilling && hasUnpatchedReasonCode)) {
          return {
            exitCode: 1,
            stdout: '',
            stderr: `FAIL src/__tests__/patchpilot.regression.test.ts
  ● PaymentController Regression › fails when client transmits null or empty reason
    TypeError: Cannot read properties of undefined (reading 'code')
      at handleRefund (src/paymentController.ts:44:33)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 passed, 2 total
Snapshots:   0 total
Time:        0.984 s`
          };
        }

        return {
          exitCode: 1,
          stdout: '',
          stderr: `FAIL src/__tests__/paymentController.test.ts
  ● PaymentController › fails when client transmits null or empty metadata
    TypeError: Cannot read properties of undefined (reading 'billingDetails')
      at handleCheckout (src/paymentController.ts:17:33)
      at /workspace/src/__tests__/paymentController.test.ts:35:11

Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 passed, 2 total
Snapshots:   0 total
Time:        1.054 s`
        };
      }

      // Targeted bug is patched and regression tests pass!
      const hasRegressionTest = Boolean(regEntry);
      const testCount = hasRegressionTest ? 3 : 2;

      return {
        exitCode: 0,
        stdout: `PASS src/__tests__/paymentController.test.ts
${hasRegressionTest ? 'PASS src/__tests__/patchpilot.regression.test.ts\n' : ''}
Test Suites: ${hasRegressionTest ? 2 : 1} passed, ${hasRegressionTest ? 2 : 1} total
Tests:       ${testCount} passed, ${testCount} total
Snapshots:   0 total
Time:        1.142 s
Ran all test suites.`,
        stderr: ''
      };
    }

    // 2. Linter simulation
    if (cmd.includes('eslint') || cmd.includes('lint')) {
      return {
        exitCode: 0,
        stdout: '✔ ESLint checked 6 files. Zero errors, zero warnings found.',
        stderr: ''
      };
    }

    // 3. Typecheck simulation
    if (cmd.includes('tsc') || cmd.includes('typecheck')) {
      return {
        exitCode: 0,
        stdout: '✔ TypeScript compilation passed: 0 type errors found.',
        stderr: ''
      };
    }

    // 4. Git commands
    if (cmd.includes('git')) {
      return { exitCode: 0, stdout: 'Git command completed successfully', stderr: '' };
    }

    // 5. Default success
    return { exitCode: 0, stdout: `Command executed in isolated sandbox: ${cmd}`, stderr: '' };
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    this.files.set(filePath, content);
  }

  async readFile(filePath: string): Promise<string> {
    const val = this.files.get(filePath);
    if (val !== undefined) return val;

    // Check with normalized path
    for (const [k, v] of this.files.entries()) {
      if (k.endsWith(filePath) || filePath.endsWith(k)) {
        return v;
      }
    }

    throw new Error(`File not found: ${filePath}`);
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
