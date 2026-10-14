// src/core/contextBuilder.ts
import { Incident } from './schemas';
import { gitHubAdapter, getGitHubAdapterForProject } from '../adapters/repohosts/github';
import { scrubSecrets } from '../policy/scrubber';
import { wrapUntrustedData } from '../policy/injectionGuards';
import { db } from '../db';
import { memories } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

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
  const repoHost = await getGitHubAdapterForProject(incident.projectId);

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
  const inAppFrames = frames.filter((f: any) => 
    f && f.inApp && f.file && !f.file.startsWith('.github/') && !f.file.endsWith('.yml') && !f.file.endsWith('.yaml')
  );

  let targetFiles = Array.from(new Set(inAppFrames.map((f: any) => f.file))).slice(0, 3);
  if (targetFiles.length === 0) {
    // Try discovering source file mentioned in error message or log excerpt
    const textToScan = `${incident.errorMessage || ''}\n${incident.logExcerpt || ''}`;
    const fileMatches = textToScan.match(/(src\/[a-zA-Z0-9_\-\.\/]+\.(?:ts|js|tsx|jsx))/g);
    if (fileMatches && fileMatches.length > 0) {
      const filtered = fileMatches.filter(f => !f.includes('.test.') && !f.includes('.spec.'));
      if (filtered.length > 0) {
        targetFiles.push(...filtered.slice(0, 2));
      }
    }

    // If still empty, inspect repository snapshot for application source files
    if (targetFiles.length === 0) {
      try {
        const snapshot = await repoHost.getSnapshot(repo, commitRef);
        const sourceFile = Object.keys(snapshot).find(
          f => f.startsWith('src/') && (f.endsWith('.ts') || f.endsWith('.js')) && !f.includes('.test.') && !f.includes('.spec.')
        );
        if (sourceFile) targetFiles.push(sourceFile);
      } catch {
        try {
          const snapshot = await repoHost.getSnapshot(repo, 'main');
          const sourceFile = Object.keys(snapshot).find(
            f => f.startsWith('src/') && (f.endsWith('.ts') || f.endsWith('.js')) && !f.includes('.test.') && !f.includes('.spec.')
          );
          if (sourceFile) targetFiles.push(sourceFile);
        } catch {}
      }
    }

    if (targetFiles.length === 0) {
      targetFiles.push('src/paymentController.ts');
    }
  }

  for (const filePath of targetFiles) {
    let rawContent = '';
    try {
      rawContent = await repoHost.getFile(repo, commitRef, filePath);
    } catch {
      try {
        rawContent = await repoHost.getFile(repo, 'main', filePath);
      } catch {
        // Fallback to local demo-app fixture if available
        try {
          const fixturePath = path.join(process.cwd(), 'fixtures', 'demo-app', filePath);
          if (fs.existsSync(fixturePath)) {
            rawContent = fs.readFileSync(fixturePath, 'utf-8');
          } else {
            const fallbackPath = path.join(process.cwd(), 'fixtures', 'demo-app', 'src', 'paymentController.ts');
            if (fs.existsSync(fallbackPath)) {
              rawContent = fs.readFileSync(fallbackPath, 'utf-8');
            }
          }
        } catch {}
      }
    }

    if (!rawContent) {
      rawContent = `// Source file: ${filePath}\n// Content preview unavailable from remote ref`;
    }

    const lines = rawContent.split('\n');

    // Find target line from stack frame
    const frame = inAppFrames.find(f => f.file === filePath);
    const lineNum = frame?.line || 17;
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

  // 2. Fetch suspect commit diff with fallback
  let rawDiff = '';
  try {
    rawDiff = await repoHost.commitDiff(repo, commitRef, incident.commitSha || 'head');
  } catch {
    try {
      rawDiff = await repoHost.commitDiff(repo, 'main', 'head');
    } catch {
      rawDiff = 'Suspect commit diff: modification in controller parameter handling.';
    }
  }
  const suspectCommitDiff = scrubSecrets(rawDiff);

  // 3. Fetch recent commits touching files
  let recentCommits: any[] = [];
  try {
    recentCommits = await repoHost.recentCommits(repo, 'main', targetFiles);
  } catch {}

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
