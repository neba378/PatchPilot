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
      const binDir = path.join(this.workDir, 'node_modules', '.bin');
      const env = {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH || ''}`,
        ...opts?.env
      };
      const { stdout, stderr } = await execAsync(command, {
        cwd: targetDir,
        env,
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

    // Link demo node_modules if present so tests and runner execute cleanly
    const demoModules = path.join(process.cwd(), 'fixtures', 'demo-app', 'node_modules');
    if (fs.existsSync(demoModules)) {
      try {
        fs.symlinkSync(demoModules, path.join(workDir, 'node_modules'), 'junction');
      } catch (err: any) {
        logger.warn({ err: err.message }, '[LocalDockerSandbox] Failed to symlink demo node_modules');
      }
    }

    // Ensure tsconfig.json exists for TypeScript compilation checks
    const tsconfigPath = path.join(workDir, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      const basicTsConfig = JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          esModuleInterop: true,
          strict: false,
          skipLibCheck: true
        }
      }, null, 2);
      fs.writeFileSync(tsconfigPath, basicTsConfig, 'utf-8');
    }

    // Initialize git repo in sandbox to calculate real diffs
    try {
      await sbx.exec('git init && git config user.name "PatchPilot" && git config user.email "patchpilot@local" && git add . && git commit -m "initial"');
    } catch (err: any) {
      logger.warn({ err: err.message }, '[LocalDockerSandbox] Git initialization in sandbox failed');
    }

    return sbx;
  }
}
