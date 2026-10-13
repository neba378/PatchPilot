// src/adapters/repohosts/types.ts

export interface CodeHit {
  path: string;
  line: number;
  snippet: string;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  filesTouched: string[];
}

export interface PullRequestInfo {
  number: number;
  url: string;
  title: string;
  body: string;
  branch: string;
  isDraft: boolean;
  state: 'open' | 'closed' | 'merged';
}

export interface RepoHostAdapter {
  id: string;
  getFile(repo: string, ref: string, path: string): Promise<string>;
  getSnapshot(repo: string, ref: string): Promise<Record<string, string>>;
  searchCode(repo: string, ref: string, query: string): Promise<CodeHit[]>;
  recentCommits(repo: string, ref: string, paths?: string[]): Promise<CommitInfo[]>;
  commitDiff(repo: string, ref: string, sha: string): Promise<string>;
  createBranch(repo: string, baseSha: string, branchName: string): Promise<void>;
  commitFiles(repo: string, branch: string, files: Record<string, string>, message: string): Promise<string>;
  openDraftPr(repo: string, args: { title: string; body: string; head: string; base?: string }): Promise<PullRequestInfo>;
  getPr(repo: string, number: number): Promise<PullRequestInfo>;
  parseWebhook(req: any): any | null;
}
