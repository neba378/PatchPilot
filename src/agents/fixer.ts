// src/agents/fixer.ts
import { InvestigationOutput, FixOutput, FixOutputSchema } from '../core/schemas';
import { logger } from '../core/logger';
import { getLanguageModel } from './provider';
import { generateObject } from 'ai';
import { geminiRateLimiter } from './rateLimiter';

export async function generateFixEdits(
  investigation: InvestigationOutput,
  fileContent: string,
  targetFilePath: string,
  options: { projectId?: string } = {}
): Promise<FixOutput> {
  const { model, provider, modelName } = await getLanguageModel({ projectId: options.projectId });

  if (provider === 'gemini') {
    const allowed = await geminiRateLimiter.acquire();
    if (!allowed) {
      throw new Error('Gemini API rate limit reached (10 RPM / 250 RPD limit).');
    }
  }

  logger.info({ provider, model: modelName, file: targetFilePath }, '[FixerAgent] Calling AI model via Vercel AI SDK to synthesize patch');

    const prompt = `
You are PatchPilot, an expert Autonomous Code Repair Engineer.
Based on the verified investigation below, synthesize a MINIMAL, SAFE, NON-BREAKING patch.

STRICT CONSTRAINTS:
1. Return edits ONLY as search-and-replace blocks ({ path, search, replace }).
2. Do NOT provide whole-file rewrites. The 'search' string must match EXACTLY ONCE in the target file.
3. Make the minimal change necessary (maximum 3 files, maximum 60 changed lines).
4. Write a corresponding regression test in Vitest/Jest format that asserts the bug is fixed and tests edge cases.

VERIFIED ROOT CAUSE:
${investigation.rootCauses.join('\n')}

LEADING HYPOTHESIS:
${investigation.hypotheses.find(h => h.status === 'leading')?.statement || 'Code Bug'}

TARGET FILE (${targetFilePath}):
\`\`\`
${fileContent}
\`\`\`
`;

    try {
      const res = await generateObject({
        model,
        schema: FixOutputSchema,
        prompt
      });

      logger.info({ explanation: res.object.explanation }, '[FixerAgent] AI SDK patch synthesis complete');
      return res.object;
    } catch (err: any) {
      logger.error({ error: err.message }, '[FixerAgent] AI SDK patch synthesis failed');
      throw new Error(`AI model patch synthesis failed: ${err.message}`);
    }
}
