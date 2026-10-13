// src/core/schemas.ts
import { z } from 'zod';

export const StackFrameSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  column: z.number().optional(),
  function: z.string().optional(),
  inApp: z.boolean().default(true)
});

export const RelatedSignalSchema = z.object({
  source: z.string(),
  signalId: z.string().optional(),
  externalId: z.string().optional(),
  timestamp: z.string()
});

export const IncidentSeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type IncidentSeverity = z.infer<typeof IncidentSeveritySchema>;

export const IncidentCategorySchema = z.enum([
  'code_bug',
  'flaky_test',
  'dependency',
  'config',
  'infrastructure'
]);
export type IncidentCategory = z.infer<typeof IncidentCategorySchema>;

export const IncidentStatusSchema = z.enum([
  'new',
  'diagnosing',
  'awaiting_approval',
  'snoozed',
  'rejected',
  'fixing',
  'validating',
  'pr_open',
  'merged',
  'verified_resolved',
  'reopened',
  'abstained',
  'fix_failed'
]);
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;

export const IncidentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  source: z.string(),
  externalId: z.string().optional().nullable(),
  fingerprint: z.string(),
  title: z.string(),
  severity: IncidentSeveritySchema,
  category: IncidentCategorySchema,
  status: IncidentStatusSchema.default('new'),
  environment: z.string().default('production'),
  errorType: z.string().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
  stackFrames: z.array(StackFrameSchema).default([]),
  logExcerpt: z.string().optional().nullable(),
  release: z.string().optional().nullable(),
  commitSha: z.string().optional().nullable(),
  repo: z.string().optional().nullable(),
  occurredAt: z.string(),
  detectedAt: z.string(),
  occurrences: z.number().default(1),
  relatedSignals: z.array(RelatedSignalSchema).default([])
});

export type Incident = z.infer<typeof IncidentSchema>;

export const HypothesisStatusSchema = z.enum(['leading', 'open', 'ruled_out']);

export const HypothesisSchema = z.object({
  statement: z.string(),
  supportingEvidence: z.string(),
  counterEvidence: z.string().optional().default('None found'),
  confidence: z.number().min(0).max(1),
  status: HypothesisStatusSchema
});

export const InvestigationOutputSchema = z.object({
  hypotheses: z.array(HypothesisSchema).min(1),
  rootCauses: z.array(z.string()).min(1),
  suspectCommit: z.object({
    sha: z.string(),
    message: z.string().optional(),
    author: z.string().optional()
  }).optional(),
  affectedFiles: z.array(z.string()).min(1),
  fixable: z.boolean(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  noiseIgnored: z.array(z.string()).default([]),
  abstainReason: z.string().optional(),
  confidenceScore: z.number().min(0).max(100)
});

export type InvestigationOutput = z.infer<typeof InvestigationOutputSchema>;

export const SearchReplaceEditSchema = z.object({
  path: z.string(),
  search: z.string(),
  replace: z.string()
});

export const FixOutputSchema = z.object({
  edits: z.array(SearchReplaceEditSchema),
  explanation: z.string(),
  regressionTestPath: z.string(),
  regressionTestCode: z.string()
});

export type FixOutput = z.infer<typeof FixOutputSchema>;
