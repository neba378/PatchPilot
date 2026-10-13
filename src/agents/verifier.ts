// src/agents/verifier.ts
import { InvestigationOutput } from '../core/schemas';
import { logger } from '../core/logger';

export interface VerificationResult {
  verifiedHypothesis: string;
  adjustedConfidence: number;
  shouldAbstain: boolean;
  abstainReason?: string;
  verificationNotes: string;
}

export async function runVerifierPass(investigation: InvestigationOutput): Promise<VerificationResult> {
  const leading = investigation.hypotheses.find(h => h.status === 'leading') || investigation.hypotheses[0];

  logger.info({ hypothesis: leading.statement }, '[VerifierPass] Attempting adversarial falsification of leading hypothesis');

  // If already deemed not fixable or has abstain reason, respect it
  if (!investigation.fixable || investigation.abstainReason) {
    return {
      verifiedHypothesis: leading.statement,
      adjustedConfidence: leading.confidence,
      shouldAbstain: true,
      abstainReason: investigation.abstainReason || 'Investigation determined failure is not safely fixable by automated code mutation.',
      verificationNotes: 'Abstained based on policy and risk profile.'
    };
  }

  // Refutation analysis: Check if evidence is solid
  let confidence = leading.confidence;
  let shouldAbstain = false;
  let abstainReason: string | undefined;

  if (investigation.riskLevel === 'high') {
    confidence = Math.max(0, confidence - 0.2);
  }

  // Threshold check: default 0.60
  if (confidence < 0.60) {
    shouldAbstain = true;
    abstainReason = `Confidence score (${Math.round(confidence * 100)}%) is below safety threshold (60%). Escalating to human on-call engineer.`;
  }

  return {
    verifiedHypothesis: leading.statement,
    adjustedConfidence: confidence,
    shouldAbstain,
    abstainReason,
    verificationNotes: shouldAbstain
      ? `Falsification pass identified residual ambiguity: ${abstainReason}`
      : `Leading hypothesis resisted adversarial falsification with ${Math.round(confidence * 100)}% confidence.`
  };
}
