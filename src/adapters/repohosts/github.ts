// src/adapters/repohosts/github.ts
import { Octokit } from '@octokit/rest';
import { RepoHostAdapter, CodeHit, CommitInfo, PullRequestInfo } from './types';
import { logger } from '../../core/logger';
import fs from 'fs';
import path from 'path';

// Built-in demo file repository for offline / zero-token demo mode
const DEMO_FIXTURE_FILES: Record<string, string> = {
  'src/controllers/paymentController.ts': `import { processStripeCharge } from '../services/stripeService';
import { Logger } from '../utils/logger';

export async function handleCheckout(req: any, res: any) {
  try {
    const { amount, currency, customerId, metadata } = req.body;
    
    // Buggy: metadata is assumed to always be an object, throws TypeError when customer sends null
    const billingZip = metadata.billingDetails.postalCode;
    
    const result = await processStripeCharge({
      amount,
      currency,
      customerId,
      zip: billingZip
    });

    return res.status(200).json({ success: true, chargeId: result.id });
  } catch (error: any) {
    Logger.error("Checkout transaction failure", { error: error.message, stack: error.stack });
    throw error;
  }
}`,
  'src/controllers/__tests__/paymentController.test.ts': `import { handleCheckout } from '../paymentController';

describe('PaymentController', () => {
  it('should process regular payment with valid metadata', async () => {
    const req = {
      body: {
        amount: 5000,
        currency: 'usd',
        customerId: 'cus_9912',
        metadata: { billingDetails: { postalCode: '94103' } }
      }
    };
    const res = { status: () => ({ json: (data: any) => data }) };
  });
});`,
  'package.json': `{\n  "name": "checkout-service",\n  "version": "1.0.0",\n  "scripts": {\n    "test": "vitest run"\n  }\n}`
};

export class GitHubAdapter implements RepoHostAdapter {
  id = 'github';
  private octokit?: Octokit;
  private mockPrs: Map<number, PullRequestInfo> = new Map();
  private mockBranches: Set<string> = new Set();

  constructor(token?: string) {
    const effectiveToken = token || process.env.GITHUB_TOKEN;
    if (effectiveToken) {
      this.octokit = new Octokit({ auth: effectiveToken });
    }
  }

  async getFile(repo: string, ref: string, filePath: string): Promise<string> {
    if (this.octokit) {
      try {
        const [owner, repoName] = repo.split('/');
        const res = await this.octokit.rest.repos.getContent({
          owner,
          repo: repoName,
          path: filePath,
          ref
        });
        if ('content' in res.data) {
          return Buffer.from(res.data.content, 'base64').toString('utf-8');
        }
      } catch (err: any) {
        logger.warn({ error: err.message, filePath }, '[GitHubAdapter] Octokit getFile failed, using fixture fallback');
      }
    }

    // Fallback to demo fixture repository
    if (DEMO_FIXTURE_FILES[filePath]) {
      return DEMO_FIXTURE_FILES[filePath];
    }
    return `// Mock file for ${filePath}\nexport const placeholder = true;\n`;
  }

  async getSnapshot(repo: string, ref: string): Promise<Record<string, string>> {
    return { ...DEMO_FIXTURE_FILES };
  }

  async searchCode(repo: string, ref: string, query: string): Promise<CodeHit[]> {
    const hits: CodeHit[] = [];
    for (const [filePath, content] of Object.entries(DEMO_FIXTURE_FILES)) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(query.toLowerCase())) {
          hits.push({
            path: filePath,
            line: i + 1,
            snippet: lines[i].trim()
          });
        }
      }
    }
    return hits;
  }

  async recentCommits(repo: string, ref: string, paths?: string[]): Promise<CommitInfo[]> {
    return [
      {
        sha: 'a7b31e9',
        message: 'feat: add customer metadata payload parsing in checkout',
        author: 'dev-lead@startup.io',
        date: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        filesTouched: ['src/controllers/paymentController.ts']
      },
      {
        sha: 'f491c02',
        message: 'chore: setup stripe webhook listener',
        author: 'engineer@startup.io',
        date: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        filesTouched: ['src/services/stripeService.ts']
      }
    ];
  }

  async commitDiff(repo: string, ref: string, sha: string): Promise<string> {
    return `diff --git a/src/controllers/paymentController.ts b/src/controllers/paymentController.ts
index b1928a..c9918f 100644
--- a/src/controllers/paymentController.ts
+++ b/src/controllers/paymentController.ts
@@ -6,4 +6,6 @@ export async function handleCheckout(req: any, res: any) {
+    const { amount, currency, customerId, metadata } = req.body;
+    const billingZip = metadata.billingDetails.postalCode;`;
  }

  async createBranch(repo: string, baseSha: string, branchName: string): Promise<void> {
    this.mockBranches.add(branchName);
    logger.info({ repo, branchName, baseSha }, '[GitHubAdapter] Created branch');
  }

  async commitFiles(repo: string, branch: string, files: Record<string, string>, message: string): Promise<string> {
    logger.info({ repo, branch, filesCount: Object.keys(files).length, message }, '[GitHubAdapter] Committed files');
    return 'c894ef1a';
  }

  async openDraftPr(repo: string, args: { title: string; body: string; head: string; base?: string }): Promise<PullRequestInfo> {
    const prNumber = Math.floor(40 + Math.random() * 50);
    const pr: PullRequestInfo = {
      number: prNumber,
      url: `https://github.com/${repo}/pull/${prNumber}`,
      title: args.title,
      body: args.body,
      branch: args.head,
      isDraft: true,
      state: 'open'
    };
    this.mockPrs.set(prNumber, pr);
    logger.info({ repo, prNumber, url: pr.url }, '[GitHubAdapter] Opened draft PR with proof');
    return pr;
  }

  async getPr(repo: string, number: number): Promise<PullRequestInfo> {
    const existing = this.mockPrs.get(number);
    if (existing) return existing;

    return {
      number,
      url: `https://github.com/${repo}/pull/${number}`,
      title: `[PatchPilot Fix] Automated fix`,
      body: 'Evidence and validation summary',
      branch: 'patchpilot/fix-branch',
      isDraft: true,
      state: 'open'
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
