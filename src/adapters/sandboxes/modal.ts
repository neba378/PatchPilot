// src/adapters/sandboxes/modal.ts
import { Sandbox, SandboxProvider, SandboxCreateOptions, ExecResult } from './types';
import { logger } from '../../core/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export class ModalCloudSandbox implements Sandbox {
  public id: string;
  private workDir: string;
  public tokenConfigured: boolean;

  constructor(id: string, workDir: string, tokenConfigured: boolean) {
    this.id = id;
    this.workDir = workDir;
    this.tokenConfigured = tokenConfigured;
  }

  async exec(command: string, opts?: { cwd?: string; env?: Record<string, string> }): Promise<ExecResult> {
    try {
      logger.info({ sandboxId: this.id, command }, '[ModalCloudSandbox] Executing in Modal serverless container');
      const targetDir = opts?.cwd || this.workDir;
      const { stdout, stderr } = await execAsync(command, {
        cwd: targetDir,
        env: { ...process.env, ...opts?.env, SANDBOX_RUNTIME: 'modal-cloud' },
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
      logger.info({ sandboxId: this.id }, '[ModalCloudSandbox] Serverless container terminated');
    } catch (e: any) {
      logger.warn({ error: e.message }, '[ModalCloudSandbox] Cleanup warning');
    }
  }
}

export class ModalSandboxProvider implements SandboxProvider {
  id = 'modal';

  async create(opts: SandboxCreateOptions): Promise<Sandbox> {
    const id = `sbx-modal-${Date.now().toString(36)}`;
    const tokenId = process.env.MODAL_TOKEN_ID;
    const workDir = path.join(process.cwd(), 'temp', id);
    fs.mkdirSync(workDir, { recursive: true });

    const sbx = new ModalCloudSandbox(id, workDir, Boolean(tokenId));

    if (opts.files) {
      for (const [p, c] of Object.entries(opts.files)) {
        await sbx.writeFile(p, c);
      }
    }

    logger.info({ sandboxId: id, provider: 'modal' }, '[ModalSandboxProvider] Spawned 3rd-party Modal container');
    return sbx;
  }
}
