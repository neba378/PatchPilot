import { Octokit } from '@octokit/rest';
import { RepoHostAdapter, CodeHit, CommitInfo, PullRequestInfo } from './types';
import { logger } from '../../core/logger';
import { db } from '../../db';
import { connections } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export class GitHubAdapter implements RepoHostAdapter {
  id = 'github';
  private octokit?: Octokit;

  constructor(token?: string) {
    const effectiveToken = token || process.env.GITHUB_TOKEN;
    if (effectiveToken && effectiveToken !== 'mock') {
      this.octokit = new Octokit({ auth: effectiveToken });
      logger.info('[GitHubAdapter] Initialized with real Octokit client authentication');
    } else {
      logger.warn('[GitHubAdapter] GITHUB_TOKEN not set; running with unauthenticated/public rate limits');
      this.octokit = new Octokit();
    }
  }

  private parseRepo(repo: string): { owner: string; repoName: string } {
    const parts = repo.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid GitHub repository format '${repo}'. Expected 'owner/repo'.`);
    }
    return { owner: parts[0], repoName: parts[1] };
  }

  async getFile(repo: string, ref: string, filePath: string): Promise<string> {
    if (!this.octokit) throw new Error('GitHub client not initialized');
    const { owner, repoName } = this.parseRepo(repo);

    logger.info({ repo, ref, filePath }, '[GitHubAdapter] Fetching file content from GitHub');
    const res = await this.octokit.rest.repos.getContent({
      owner,
      repo: repoName,
      path: filePath,
      ref
    });

    if ('content' in res.data && typeof res.data.content === 'string') {
      return Buffer.from(res.data.content, 'base64').toString('utf-8');
    }

    throw new Error(`Path '${filePath}' in repo '${repo}' is not a file`);
  }

  async getSnapshot(repo: string, ref: string): Promise<Record<string, string>> {
    if (!this.octokit) throw new Error('GitHub client not initialized');
    const { owner, repoName } = this.parseRepo(repo);

    logger.info({ repo, ref }, '[GitHubAdapter] Downloading repository tree snapshot');

    // Resolve ref to commit SHA
    let commitSha = ref;
    try {
      const refRes = await this.octokit.rest.git.getRef({
        owner,
        repo: repoName,
        ref: ref.startsWith('heads/') || ref.startsWith('tags/') ? ref : `heads/${ref}`
      });
      commitSha = refRes.data.object.sha;
    } catch {
      // If ref is already a raw 40-char SHA
      commitSha = ref;
    }

    // Fetch complete recursive tree
    const treeRes = await this.octokit.rest.git.getTree({
      owner,
      repo: repoName,
      tree_sha: commitSha,
      recursive: 'true'
    });

    const files: Record<string, string> = {};
    for (const item of treeRes.data.tree) {
      if (item.type === 'blob' && item.path) {
        // Exclude binary assets, locks, and node_modules from text snapshot
        const p = item.path;
        if (
          !p.includes('node_modules/') &&
          !p.startsWith('.git/') &&
          !p.endsWith('.png') &&
          !p.endsWith('.jpg') &&
          !p.endsWith('.zip') &&
          !p.endsWith('.tar.gz')
        ) {
          try {
            const content = await this.getFile(repo, commitSha, p);
            files[p] = content;
          } catch (err: any) {
            logger.warn({ path: p, error: err.message }, '[GitHubAdapter] Skipping unreadable blob');
          }
        }
      }
    }

    return files;
  }

  async searchCode(repo: string, ref: string, query: string): Promise<CodeHit[]> {
    if (!this.octokit) throw new Error('GitHub client not initialized');
    const { owner, repoName } = this.parseRepo(repo);

    logger.info({ repo, query }, '[GitHubAdapter] Searching code via GitHub API');
    try {
      const q = `${query} repo:${owner}/${repoName}`;
      const res = await this.octokit.rest.search.code({ q });

      return res.data.items.map(item => ({
        path: item.path,
        line: 1,
        snippet: item.name
      }));
    } catch (err: any) {
      logger.warn({ error: err.message }, '[GitHubAdapter] Search code failed, falling back to tree search');
      const snapshot = await this.getSnapshot(repo, ref);
      const hits: CodeHit[] = [];
      for (const [p, content] of Object.entries(snapshot)) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(query.toLowerCase())) {
            hits.push({ path: p, line: i + 1, snippet: lines[i].trim() });
          }
        }
      }
      return hits;
    }
  }

  async recentCommits(repo: string, ref: string, paths?: string[]): Promise<CommitInfo[]> {
    if (!this.octokit) throw new Error('GitHub client not initialized');
    const { owner, repoName } = this.parseRepo(repo);

    logger.info({ repo, ref }, '[GitHubAdapter] Listing recent commits');
    const res = await this.octokit.rest.repos.listCommits({
      owner,
      repo: repoName,
      sha: ref,
      per_page: 5
    });

    return res.data.map(c => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author?.name || c.author?.login || 'unknown',
      date: c.commit.author?.date || new Date().toISOString(),
      filesTouched: []
    }));
  }

  async commitDiff(repo: string, ref: string, sha: string): Promise<string> {
    if (!this.octokit) throw new Error('GitHub client not initialized');
    const { owner, repoName } = this.parseRepo(repo);

    logger.info({ repo, sha }, '[GitHubAdapter] Fetching commit diff');
    const res = await this.octokit.rest.repos.getCommit({
      owner,
      repo: repoName,
      ref: sha,
      headers: {
        accept: 'application/vnd.github.v3.diff'
      }
    });

    return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  }

  async createBranch(repo: string, baseShaOrBranch: string, branchName: string): Promise<void> {
    if (!this.octokit) throw new Error('GitHub client not initialized');
    const { owner, repoName } = this.parseRepo(repo);

    logger.info({ repo, branchName, base: baseShaOrBranch }, '[GitHubAdapter] Creating real git branch');

    let sha = baseShaOrBranch;
    if (!/^[0-9a-f]{40}$/.test(baseShaOrBranch)) {
      const refRes = await this.octokit.rest.git.getRef({
        owner,
        repo: repoName,
        ref: `heads/${baseShaOrBranch}`
      });
      sha = refRes.data.object.sha;
    }

    await this.octokit.rest.git.createRef({
      owner,
      repo: repoName,
      ref: `refs/heads/${branchName}`,
      sha
    });

    logger.info({ repo, branchName, sha }, '[GitHubAdapter] Branch created successfully on GitHub');
  }

  async commitFiles(repo: string, branch: string, files: Record<string, string>, message: string): Promise<string> {
    if (!this.octokit) throw new Error('GitHub client not initialized');
    const { owner, repoName } = this.parseRepo(repo);

    logger.info({ repo, branch, filesCount: Object.keys(files).length }, '[GitHubAdapter] Committing files via Git Data API');

    // 1. Get latest commit on branch
    const branchRef = await this.octokit.rest.git.getRef({
      owner,
      repo: repoName,
      ref: `heads/${branch}`
    });
    const latestCommitSha = branchRef.data.object.sha;
    const latestCommit = await this.octokit.rest.git.getCommit({
      owner,
      repo: repoName,
      commit_sha: latestCommitSha
    });
    const baseTreeSha = latestCommit.data.tree.sha;

    // 2. Create blobs for each file
    const treeItems: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];
    for (const [filePath, content] of Object.entries(files)) {
      const blobRes = await this.octokit.rest.git.createBlob({
        owner,
        repo: repoName,
        content,
        encoding: 'utf-8'
      });
      treeItems.push({
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blobRes.data.sha
      });
    }

    // 3. Create tree
    const newTree = await this.octokit.rest.git.createTree({
      owner,
      repo: repoName,
      base_tree: baseTreeSha,
      tree: treeItems
    });

    // 4. Create commit
    const newCommit = await this.octokit.rest.git.createCommit({
      owner,
      repo: repoName,
      message,
      tree: newTree.data.sha,
      parents: [latestCommitSha]
    });

    // 5. Update branch reference
    await this.octokit.rest.git.updateRef({
      owner,
      repo: repoName,
      ref: `heads/${branch}`,
      sha: newCommit.data.sha
    });

    logger.info({ repo, branch, commitSha: newCommit.data.sha }, '[GitHubAdapter] Commit pushed successfully to GitHub branch');
    return newCommit.data.sha;
  }

  async openDraftPr(repo: string, args: { title: string; body: string; head: string; base?: string }): Promise<PullRequestInfo> {
    if (!this.octokit) throw new Error('GitHub client not initialized');
    const { owner, repoName } = this.parseRepo(repo);

    logger.info({ repo, head: args.head, title: args.title }, '[GitHubAdapter] Opening real DRAFT pull request on GitHub');

    const prRes = await this.octokit.rest.pulls.create({
      owner,
      repo: repoName,
      title: args.title,
      body: args.body,
      head: args.head,
      base: args.base || 'main',
      draft: true
    });

    logger.info({ repo, prNumber: prRes.data.number, url: prRes.data.html_url }, '[GitHubAdapter] Draft PR created successfully on GitHub');

    return {
      number: prRes.data.number,
      url: prRes.data.html_url,
      title: prRes.data.title,
      body: prRes.data.body || '',
      branch: args.head,
      isDraft: prRes.data.draft ?? true,
      state: prRes.data.state as any
    };
  }

  async getPr(repo: string, number: number): Promise<PullRequestInfo> {
    if (!this.octokit) throw new Error('GitHub client not initialized');
    const { owner, repoName } = this.parseRepo(repo);

    const prRes = await this.octokit.rest.pulls.get({
      owner,
      repo: repoName,
      pull_number: number
    });

    return {
      number: prRes.data.number,
      url: prRes.data.html_url,
      title: prRes.data.title,
      body: prRes.data.body || '',
      branch: prRes.data.head.ref,
      isDraft: prRes.data.draft ?? false,
      state: prRes.data.state as any
    };
  }

  parseWebhook(req: any): any | null {
    if (req.body?.pull_request && req.body?.action === 'closed' && req.body?.pull_request?.merged) {
      return {
        type: 'pr_merged',
        prNumber: req.body.pull_request.number,
        mergedAt: req.body.pull_request.merged_at
      };
    }
    return null;
  }
}

export const gitHubAdapter = new GitHubAdapter();

export async function getGitHubAdapterForProject(projectId?: string): Promise<GitHubAdapter> {
  if (projectId) {
    try {
      const conn = await db.select().from(connections)
        .where(and(eq(connections.projectId, projectId), eq(connections.type, 'github')))
        .get();
      if (conn?.encryptedSecret) {
        return new GitHubAdapter(conn.encryptedSecret);
      }
    } catch (err: any) {
      logger.warn({ error: err.message, projectId }, '[GitHubAdapter] Failed to lookup project GitHub connection, using default adapter');
    }
  }
  return gitHubAdapter;
}

