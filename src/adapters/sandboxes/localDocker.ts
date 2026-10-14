// src/adapters/sandboxes/localDocker.ts
import { Sandbox, SandboxProvider, SandboxCreateOptions, ExecResult } from './types';
import { logger } from '../../core/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export class LocalDockerSandbox implements Sandbox {
  public id: string;
  private workDir: string;

  constructor(id: string, workDir: string) {
    this.id = id;
    this.workDir = workDir;
  }

  async exec(command: string, opts?: { cwd?: string; env?: Record<string, string> }): Promise<ExecResult> {
    try {
      const targetDir = opts?.cwd || this.workDir;
      const { stdout, stderr } = await execAsync(command, {
        cwd: targetDir,
        env: { ...process.env, ...opts?.env },
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
      logger.info({ sandboxId: this.id }, '[LocalDockerSandbox] Destroyed working directory');
    } catch (e: any) {
      logger.warn({ error: e.message }, '[LocalDockerSandbox] Cleanup warning');
    }
  }
}

export class LocalDockerSandboxProvider implements SandboxProvider {
  id = 'local-docker';

  async create(opts: SandboxCreateOptions): Promise<Sandbox> {
    const id = `sbx-docker-${Date.now().toString(36)}`;
    const workDir = path.join(process.cwd(), 'temp', id);
    fs.mkdirSync(workDir, { recursive: true });

    const sbx = new LocalDockerSandbox(id, workDir);

    if (opts.files) {
      for (const [p, c] of Object.entries(opts.files)) {
        await sbx.writeFile(p, c);
      }
    }

    return sbx;
  }
}
