// src/adapters/sandboxes/types.ts

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface Sandbox {
  id: string;
  exec(command: string, opts?: { cwd?: string; env?: Record<string, string> }): Promise<ExecResult>;
  writeFile(filePath: string, content: string): Promise<void>;
  readFile(filePath: string): Promise<string>;
  destroy(): Promise<void>;
}

export interface SandboxCreateOptions {
  files?: Record<string, string>;
  timeoutSeconds?: number;
  apiKey?: string;
  config?: Record<string, any>;
}

export interface SandboxProvider {
  id: string;
  create(opts: SandboxCreateOptions): Promise<Sandbox>;
}
