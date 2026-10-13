// src/agents/fixer.ts
import { InvestigationOutput, FixOutput, FixOutputSchema } from '../core/schemas';
import { logger } from '../core/logger';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { geminiRateLimiter } from './rateLimiter';

export async function generateFixEdits(
  investigation: InvestigationOutput,
  fileContent: string,
  targetFilePath: string
): Promise<FixOutput> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (apiKey && apiKey.trim() !== '') {
    const allowed = await geminiRateLimiter.acquire();
    if (!allowed) {
      throw new Error('Gemini API rate limit reached (10 RPM / 250 RPD limit).');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    logger.info({ model: modelName, file: targetFilePath }, '[FixerAgent] Calling real Google Gemini API to synthesize patch');

    const google = createGoogleGenerativeAI({ apiKey });
    const model = google(modelName);

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

      logger.info({ explanation: res.object.explanation }, '[FixerAgent] Real Gemini patch synthesis complete');
      return res.object;
    } catch (err: any) {
      logger.error({ error: err.message }, '[FixerAgent] Gemini API patch synthesis failed');
      throw new Error(`Google Gemini API patch synthesis failed: ${err.message}`);
    }
  }

  throw new Error('GEMINI_API_KEY is not configured in .env. Please provide your Google AI Studio Gemini API key.');
}
