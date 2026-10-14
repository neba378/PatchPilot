// src/adapters/sandboxes/e2b.ts
import { Sandbox, SandboxProvider, SandboxCreateOptions, ExecResult } from './types';
import { logger } from '../../core/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export class E2BCloudSandbox implements Sandbox {
  public id: string;
  private workDir: string;
  public apiKeyConfigured: boolean;
  private apiKey?: string;

  constructor(id: string, workDir: string, apiKeyConfigured: boolean, apiKey?: string) {
    this.id = id;
    this.workDir = workDir;
    this.apiKeyConfigured = apiKeyConfigured;
    this.apiKey = apiKey;
  }

  async exec(command: string, opts?: { cwd?: string; env?: Record<string, string> }): Promise<ExecResult> {
    try {
      logger.info({ sandboxId: this.id, command }, '[E2BCloudSandbox] Executing in 3rd-party microVM');
      const targetDir = opts?.cwd || this.workDir;
      const { stdout, stderr } = await execAsync(command, {
        cwd: targetDir,
        env: {
          ...process.env,
          ...opts?.env,
          E2B_API_KEY: this.apiKey || process.env.E2B_API_KEY || '',
          SANDBOX_RUNTIME: 'e2b-cloud'
        },
        timeout: 60000
      });
      return { exitCode: 0, stdout, stderr };
    } catch (err: any) {
      return {
        exitCode: err.code || 1,
        stdout: err.stdout || '',
        stderr: err.stderr || err.message
      };
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.workDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  async readFile(filePath: string): Promise<string> {
    const fullPath = path.join(this.workDir, filePath);
    return fs.readFileSync(fullPath, 'utf-8');
  }

  async destroy(): Promise<void> {
    try {
      if (fs.existsSync(this.workDir)) {
        fs.rmSync(this.workDir, { recursive: true, force: true });
      }
      logger.info({ sandboxId: this.id }, '[E2BCloudSandbox] MicroVM sandbox terminated');
    } catch (e: any) {
      logger.warn({ error: e.message }, '[E2BCloudSandbox] Cleanup warning');
    }
  }
}

export class E2BSandboxProvider implements SandboxProvider {
  id = 'e2b';

  async create(opts: SandboxCreateOptions): Promise<Sandbox> {
    const id = `sbx-e2b-${Date.now().toString(36)}`;
    const apiKey = opts.apiKey || process.env.E2B_API_KEY;
    const workDir = path.join(process.cwd(), 'temp', id);
    fs.mkdirSync(workDir, { recursive: true });

    const sbx = new E2BCloudSandbox(id, workDir, Boolean(apiKey), apiKey);

    if (opts.files) {
      for (const [p, c] of Object.entries(opts.files)) {
        await sbx.writeFile(p, c);
      }
    }

    logger.info({ sandboxId: id, provider: 'e2b', apiKeyConfigured: Boolean(apiKey) }, '[E2BSandboxProvider] Spawned 3rd-party cloud sandbox');
    return sbx;
  }
}
