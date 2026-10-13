// src/agents/investigator.ts
import { InvestigationContext } from '../core/contextBuilder';
import { InvestigationOutput, InvestigationOutputSchema } from '../core/schemas';
import { geminiRateLimiter } from './rateLimiter';
import { logger } from '../core/logger';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';

export async function runInvestigation(ctx: InvestigationContext): Promise<InvestigationOutput> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (apiKey && apiKey.trim() !== '') {
    const allowed = await geminiRateLimiter.acquire();
    if (!allowed) {
      throw new Error('Gemini API rate limit reached (10 RPM / 250 RPD limit). Please wait for token bucket refill.');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    logger.info({ model: modelName }, '[Investigator] Calling real Google Gemini API via Vercel AI SDK');

    const google = createGoogleGenerativeAI({ apiKey });
    const model = google(modelName);

    const prompt = `
You are PatchPilot, an expert Autonomous SRE and Incident Investigation Agent.
Investigate this production failure using the SCIENTIFIC METHOD and ADVERSARIAL FALSIFICATION.

CRITICAL INSTRUCTIONS:
1. You MUST formulate at least TWO competing hypotheses (e.g. Hypothesis 1 vs Hypothesis 2).
2. For each hypothesis, you MUST seek out and document disproving evidence to rule out false leads.
3. Categorize hypotheses as status "leading", "open", or "ruled_out". Exactly ONE should be "leading" unless completely ambiguous.
4. Determine if the failure is fixable by automated code mutation (fixable = true/false).
5. If confidence is low (<60%) or it requires manual credentials/infrastructure changes, provide an abstainReason.

INCIDENT METADATA:
Title: ${ctx.incident.title}
Error Type: ${ctx.incident.errorType || 'Unknown'}
Error Message: ${ctx.incident.errorMessage || 'Unknown'}
Environment: ${ctx.incident.environment}

CODE EXCERPTS AROUND FAILURE:
${ctx.fileExcerpts.map(f => `File: ${f.path} (Lines ${f.startLine}-${f.endLine}):\n${f.lines}`).join('\n\n')}

SUSPECT COMMIT DIFF:
${ctx.suspectCommitDiff}

LOGS & STACK TRACE:
${ctx.scrubbedLogs}
`;

    try {
      const result = await generateObject({
        model,
        schema: InvestigationOutputSchema,
        prompt
      });

      logger.info(
        {
          confidence: result.object.confidenceScore,
          leadingHypothesis: result.object.hypotheses.find(h => h.status === 'leading')?.statement
        },
        '[Investigator] Real Gemini investigation complete'
      );

      return result.object;
    } catch (err: any) {
      logger.error({ error: err.message }, '[Investigator] Gemini API call failed');
      throw new Error(`Google Gemini API execution failed: ${err.message}`);
    }
  }

  throw new Error('GEMINI_API_KEY is not configured in .env. Please provide your Google AI Studio Gemini API key.');
}
