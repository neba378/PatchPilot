// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  repoOwner: text('repo_owner').notNull(),
  repoName: text('repo_name').notNull(),
  defaultBranch: text('default_branch').notNull().default('main'),
  sandboxProvider: text('sandbox_provider').notNull().default('fake'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const connections = sqliteTable('connections', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  type: text('type').notNull(), // 'github' | 'sentry' | 'telegram' | 'generic'
  encryptedSecret: text('encrypted_secret').notNull(),
  metadata: text('metadata').notNull().default('{}'), // JSON
  createdAt: text('created_at').notNull()
});

export const signals = sqliteTable('signals', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  source: text('source').notNull(), // 'sentry' | 'github_actions' | 'generic'
  rawPayload: text('raw_payload').notNull(), // JSON
  signature: text('signature'),
  receivedAt: text('received_at').notNull()
});

export const incidents = sqliteTable('incidents', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  source: text('source').notNull(),
  externalId: text('external_id'),
  fingerprint: text('fingerprint').notNull(),
  title: text('title').notNull(),
  severity: text('severity').notNull(), // 'critical' | 'high' | 'medium' | 'low'
  category: text('category').notNull(), // 'code_bug' | 'flaky_test' | 'dependency' | 'config' | 'infrastructure'
  status: text('status').notNull().default('new'), // 'new' | 'diagnosing' | 'awaiting_approval' | 'snoozed' | 'rejected' | 'fixing' | 'validating' | 'pr_open' | 'merged' | 'verified_resolved' | 'reopened' | 'abstained' | 'fix_failed'
  environment: text('environment').notNull().default('production'),
  errorType: text('error_type'),
  errorMessage: text('error_message'),
  stackFrames: text('stack_frames').notNull().default('[]'), // JSON array
  logExcerpt: text('log_excerpt'),
  release: text('release'),
  commitSha: text('commit_sha'),
  repo: text('repo'),
  occurredAt: text('occurred_at').notNull(),
  detectedAt: text('detected_at').notNull(),
  occurrences: integer('occurrences').notNull().default(1),
  relatedSignals: text('related_signals').notNull().default('[]') // JSON array
});

export const investigations = sqliteTable('investigations', {
  id: text('id').primaryKey(),
  incidentId: text('incident_id').notNull().references(() => incidents.id),
  hypotheses: text('hypotheses').notNull().default('[]'), // JSON array
  rootCauses: text('root_causes').notNull().default('[]'), // JSON array
  suspectCommit: text('suspect_commit'), // JSON
  affectedFiles: text('affected_files').notNull().default('[]'), // JSON array
  fixable: integer('fixable', { mode: 'boolean' }).notNull().default(true),
  riskLevel: text('risk_level').notNull().default('medium'), // 'low' | 'medium' | 'high'
  noiseIgnored: text('noise_ignored').notNull().default('[]'), // JSON array
  abstainReason: text('abstain_reason'),
  confidenceScore: integer('confidence_score').notNull().default(0), // 0 to 100
  reasoningTrail: text('reasoning_trail'),
  createdAt: text('created_at').notNull()
});

export const fixAttempts = sqliteTable('fix_attempts', {
  id: text('id').primaryKey(),
  incidentId: text('incident_id').notNull().references(() => incidents.id),
  status: text('status').notNull(), // 'in_progress' | 'passed' | 'failed'
  sandboxId: text('sandbox_id'),
  reproduced: integer('reproduced', { mode: 'boolean' }).notNull().default(false),
  reproductionOutput: text('reproduction_output'),
  edits: text('edits').notNull().default('[]'), // JSON array of search-and-replace blocks
  diff: text('diff'),
  regressionTestPath: text('regression_test_path'),
  regressionTestCode: text('regression_test_code'),
  mutationCheckPassed: integer('mutation_check_passed', { mode: 'boolean' }).notNull().default(false),
  testSuitePassed: integer('test_suite_passed', { mode: 'boolean' }).notNull().default(false),
  linterPassed: integer('linter_passed', { mode: 'boolean' }).notNull().default(false),
  typecheckPassed: integer('typecheck_passed', { mode: 'boolean' }).notNull().default(false),
  validationSummary: text('validation_summary'), // JSON
  tokensUsed: integer('tokens_used').notNull().default(0),
  durationMs: integer('duration_ms').notNull().default(0),
  createdAt: text('created_at').notNull()
});

export const pullRequests = sqliteTable('pull_requests', {
  id: text('id').primaryKey(),
  incidentId: text('incident_id').notNull().references(() => incidents.id),
  prNumber: integer('pr_number'),
  url: text('url').notNull(),
  branch: text('branch').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('draft'), // 'draft' | 'open' | 'merged' | 'closed'
  mergedAt: text('merged_at'),
  createdAt: text('created_at').notNull()
});

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'normalize_signal' | 'investigate' | 'sandbox_fix' | 'recurrence_watch'
  payload: text('payload').notNull(), // JSON
  status: text('status').notNull().default('queued'), // 'queued' | 'processing' | 'completed' | 'failed'
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  lastError: text('last_error'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  projectId: text('project_id'),
  timestamp: text('timestamp').notNull(),
  actor: text('actor').notNull(), // 'agent:investigator' | 'agent:fixer' | 'human:telegram' | 'human:ui' | 'system'
  action: text('action').notNull(), // 'read_file' | 'create_sandbox' | 'write_branch' | 'open_pr' | etc.
  inputsSummary: text('inputs_summary').notNull(),
  decision: text('decision').notNull(), // 'allow' | 'deny' | 'needs_approval'
  result: text('result')
});

export const policies = sqliteTable('policies', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  autonomyLevel: text('autonomy_level').notNull().default('draft_pr'), // 'notify' | 'suggest' | 'draft_pr'
  protectedPaths: text('protected_paths').notNull().default('["migrations/**", "infra/**", ".github/**", "security/**"]'),
  maxChangedFiles: integer('max_changed_files').notNull().default(3),
  maxChangedLines: integer('max_changed_lines').notNull().default(60),
  modelCallBudget: integer('model_call_budget').notNull().default(10),
  sandboxTimeoutSeconds: integer('sandbox_timeout_seconds').notNull().default(180),
  maxRetries: integer('max_retries').notNull().default(2),
  circuitBreakerTripped: integer('circuit_breaker_tripped', { mode: 'boolean' }).notNull().default(false)
});

export const chatLinks = sqliteTable('chat_links', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  channelType: text('channel_type').notNull().default('telegram'), // 'telegram' | 'slack' | 'discord'
  chatId: text('chat_id').notNull(),
  linkToken: text('link_token').notNull(),
  isLinked: integer('is_linked', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull()
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  incidentId: text('incident_id').references(() => incidents.id),
  channelType: text('channel_type').notNull(),
  chatId: text('chat_id').notNull(),
  messageId: text('message_id'),
  content: text('content').notNull(),
  status: text('status').notNull(),
  sentAt: text('sent_at').notNull()
});

export const postmortems = sqliteTable('postmortems', {
  id: text('id').primaryKey(),
  incidentId: text('incident_id').notNull().references(() => incidents.id),
  markdown: text('markdown').notNull(),
  createdAt: text('created_at').notNull()
});

export const memories = sqliteTable('memories', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  fingerprint: text('fingerprint').notNull(),
  errorType: text('error_type'),
  rootCauseSummary: text('root_cause_summary').notNull(),
  solutionSummary: text('solution_summary').notNull(),
  wasAccepted: integer('was_accepted', { mode: 'boolean' }).notNull(),
  rejectionReason: text('rejection_reason'),
  createdAt: text('created_at').notNull()
});

export const evalRuns = sqliteTable('eval_runs', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  totalCases: integer('total_cases').notNull(),
  resolvedCount: integer('resolved_count').notNull(),
  rootCauseAccuracy: integer('root_cause_accuracy').notNull(),
  falsePositiveRate: integer('false_positive_rate').notNull(),
  abstentionPrecision: integer('abstention_precision').notNull(),
  averageDurationMs: integer('average_duration_ms').notNull(),
  averageTokens: integer('average_tokens').notNull(),
  resultsJson: text('results_json').notNull()
});
