// src/core/contextBuilder.ts
import { Incident } from './schemas';
import { gitHubAdapter } from '../adapters/repohosts/github';
import { scrubSecrets } from '../policy/scrubber';
import { wrapUntrustedData } from '../policy/injectionGuards';
import { db } from '../db';
import { memories } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export interface InvestigationContext {
  incident: Incident;
  fileExcerpts: { path: string; lines: string; startLine: number; endLine: number }[];
  suspectCommitDiff: string;
  recentCommits: any[];
  scrubbedLogs: string;
  pastMemories: any[];
  tokenEstimate: number;
}

export async function buildInvestigationContext(incident: Incident): Promise<InvestigationContext> {
  const repo = incident.repo || process.env.TARGET_GITHUB_REPO || 'neba378/test';
  const commitRef = incident.commitSha || 'main';

  // 1. Fetch in-app frame files with ~40 lines window
  const fileExcerpts: { path: string; lines: string; startLine: number; endLine: number }[] = [];
  const rawFrames = incident.stackFrames;
  let frames: any[] = [];
  try {
    frames = Array.isArray(rawFrames)
      ? rawFrames
      : (typeof rawFrames === 'string' ? JSON.parse(rawFrames || '[]') : []);
  } catch {
    frames = [];
  }
  const inAppFrames = frames.filter((f: any) => f && f.inApp);

  const targetFiles = Array.from(new Set(inAppFrames.map((f: any) => f.file))).slice(0, 3);
  if (targetFiles.length === 0) {
    targetFiles.push('src/paymentController.ts');
  }

  for (const filePath of targetFiles) {
    const rawContent = await gitHubAdapter.getFile(repo, commitRef, filePath);
    const lines = rawContent.split('\n');

    // Find target line from stack frame
    const frame = inAppFrames.find(f => f.file === filePath);
    const lineNum = frame?.line || 10;
    const startLine = Math.max(1, lineNum - 20);
    const endLine = Math.min(lines.length, lineNum + 20);

    const windowedLines = lines.slice(startLine - 1, endLine).map((l, idx) => `${startLine + idx}: ${l}`).join('\n');
    fileExcerpts.push({
      path: filePath,
      lines: scrubSecrets(windowedLines),
      startLine,
      endLine
    });
  }

  // 2. Fetch suspect commit diff
  const rawDiff = await gitHubAdapter.commitDiff(repo, commitRef, incident.commitSha || 'head');
  const suspectCommitDiff = scrubSecrets(rawDiff);

  // 3. Fetch recent commits touching files
  const recentCommits = await gitHubAdapter.recentCommits(repo, commitRef, targetFiles);

  // 4. Scrub and wrap raw logs
  const scrubbedLogs = wrapUntrustedData(
    'application_error_logs',
    scrubSecrets(incident.logExcerpt || incident.errorMessage || 'No log excerpt available')
  );

  // 5. Query similar past incidents from memories table
  let pastMemories: any[] = [];
  try {
    pastMemories = await db.select().from(memories)
      .where(eq(memories.projectId, incident.projectId))
      .orderBy(desc(memories.createdAt))
      .limit(3);
  } catch {}

  // 6. Rough token estimation (~4 chars per token)
  const totalChars =
    JSON.stringify(fileExcerpts).length +
    suspectCommitDiff.length +
    JSON.stringify(recentCommits).length +
    scrubbedLogs.length;
  const tokenEstimate = Math.ceil(totalChars / 4);

  return {
    incident,
    fileExcerpts,
    suspectCommitDiff,
    recentCommits,
    scrubbedLogs,
    pastMemories,
    tokenEstimate
  };
}
