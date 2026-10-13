# PatchPilot: Implementation Prompt

Paste this whole document into your coding agent (Claude Code, Cursor, Codex, or similar) at the root of an empty repo. If the agent runs short of context, paste Sections 0 to 5 first, then one phase at a time from Section 12.

## 0. Your role and rules

You are a senior full-stack TypeScript engineer building PatchPilot, an AI incident response and remediation platform, from start to finish. Follow these rules throughout.

- **Read before you code.** Open the official docs for the Vercel AI SDK (ai-sdk.dev), Chat SDK (chat-sdk.dev/docs and chat-sdk.dev/llms-full.txt), and Sandbank (the README at github.com/chekusu/sandbank). Use each API exactly as documented in the version you install, and pin versions. Never guess API names. If the docs differ from this prompt, follow the docs and record the decision in `docs/decisions.md`.
- **Free tiers only.** No paid service and no credit card. If a service turns out to need payment, use the fallback named in this prompt and note it.
- **Vertical slice first.** Anything marked MUST ships before SHOULD, and SHOULD before COULD.
- **Work in the phases in Section 12.** At the end of each phase run typecheck, lint, and tests, commit with a clear message, and update `PROGRESS.md` (done, in progress, blocked, assumptions).
- **No secrets in code.** Provide `.env.example`. If you lack a credential (Telegram bot token, GitHub token, Gemini key, sandbox provider key), build against the interface plus a mock, and list exactly what the human must provide.
- **Assume, then write it down.** Make reasonable assumptions instead of stopping to ask, and record them.
- **Hard invariant:** nothing in this system merges, deploys, or changes a repository without an explicit human approval. Enforce it in code and cover it with a test.

## 1. The product

PatchPilot is an AI-powered incident response and automated remediation platform for software teams. It integrates with the monitoring, error-tracking, and CI/CD tools a team already uses (Sentry and GitHub Actions in this build; PostHog, Datadog, and others through adapters), investigates failures, finds the likely root cause, and sends a detailed incident report with evidence and a proposed fix to the team's chat tool (Telegram first; Slack and Discord through the same code). Once a human approves, PatchPilot provisions an isolated sandbox, reproduces the failure, implements and tests the fix, and opens a DRAFT pull request on the connected GitHub repository (GitLab is a documented future adapter). The PR carries a clear description and validation results. PatchPilot never merges and never deploys.

The five differentiators must be visible in the product and the demo:

1. **Vendor-neutral adapters.** Every source becomes one standard Incident. Adding a tool is one adapter file.
2. **Investigation by falsification.** The agent proposes competing hypotheses and tries to rule them out, and abstains when unsure.
3. **Sandbox-verified fixes.** A fix is reproduced, applied, tested, and backed by a regression test that fails before the patch and passes after.
4. **Governed autonomy.** A policy layer checks every agent action. Budgets, protected paths, circuit breakers, and an audit log apply.
5. **Measured quality.** An evaluation harness injects bugs into sample repos and reports resolution rate, false positives, abstention, and cost.

## 2. Tech stack (decided)

- **Language and tooling:** TypeScript everywhere, pnpm, Vitest, ESLint, Prettier, pino for logs, Zod for all schemas.
- **Web:** Next.js (App Router), React, Tailwind, shadcn/ui, recharts. Responsive, with light and dark themes.
- **Worker:** a separate Node process (`worker/index.ts`, run with tsx) that shares code with the web app. The queue is a `jobs` table in the database, polled by the worker with retries and idempotency. No Redis.
- **Database:** SQLite through Drizzle ORM (better-sqlite3), with a schema that ports to Postgres or Firestore.
- **AI:** Vercel AI SDK (`ai`) with `@ai-sdk/google`, model Gemini 2.5 Flash, fallback Flash-Lite. Use the SDK's agent and tool-loop support, structured output with Zod, step limits as a circuit breaker, and tool approval where it fits.
- **Chat:** Chat SDK (`chat`) with `@chat-adapter/telegram` (MUST), Slack and Discord adapters (COULD), and `@chat-adapter/state-memory` in development. Scaffold ideas from `npx create-chat-sdk@latest` if useful.
- **Sandbox:** Sandbank (`@sandbank.dev/core` plus the Daytona or E2B adapter) wrapped behind our own `SandboxProvider` interface. Sandbank is a young project, so also implement a `LocalDockerSandbox` (development fallback, no network) and a `FakeSandbox` (tests).
- **GitHub:** Octokit.

## 3. Repository layout

```
patchpilot/
  src/app/            Next.js pages and API routes
  src/core/           domain: schemas, fingerprint, correlation, triage, state machine
  src/adapters/       logsources/, repohosts/, sandboxes/, channels/
  src/agents/         investigator, verifier, fixer, testwriter, postmortem
  src/policy/         policy engine, audit log, scrubber, injection guards
  src/db/             Drizzle schema and migrations
  worker/             job runner and job handlers
  eval/               cases, runner, results
  fixtures/           sample webhook payloads and the demo app repo
  scripts/            simulate-*.ts, seed, demo, cron runner
  docs/               architecture, adapters, security, eval, decisions, demo-script
```

## 4. Core domain

**Incident** (Zod schema, used everywhere): `id`, `projectId`, `source`, `externalId`, `fingerprint`, `title`, `severity` (critical, high, medium, low), `category`, `status`, `environment`, `errorType`, `errorMessage`, `stackFrames[]` (file, line, function, inApp), `logExcerpt`, `release`, `commitSha`, `repo`, `occurredAt`, `detectedAt`, `occurrences`, `relatedSignals[]`.

**Statuses:** `new`, `diagnosing`, `awaiting_approval`, `snoozed`, `rejected`, `fixing`, `validating`, `pr_open`, `merged`, `verified_resolved`, `reopened`, `abstained`, `fix_failed`. Implement a state machine with legal transitions only, and reject illegal ones.

**Fingerprint:** sha256 of error type, normalized message, and the top in-app frame (file and function). Normalize by stripping numbers, UUIDs, hex strings, and quoted values.

**Correlation:** the same fingerprint within 24 hours increments the count. Signals from different sources that share a commit SHA, a fingerprint, or the same file and function within 30 minutes merge into one incident with `relatedSignals`.

**Triage (rule-based, no LLM):** classify as `code_bug`, `flaky_test`, `dependency`, `config`, or `infrastructure` using error patterns (for example timeouts, ECONNRESET, rate limits, missing module, missing env var, assertion failures). Score severity from environment, occurrence count, and affected users when known. Only `code_bug` (and simple config or dependency cases when policy allows) proceed to a fix attempt. Others are reported and marked `abstained`.

**Other tables:** `projects`, `connections` (encrypted secrets), `signals` (raw payloads), `investigations`, `fix_attempts`, `pull_requests`, `jobs`, `audit_log` (append-only), `policies`, `chat_links`, `messages`, `postmortems`, `memories`, `eval_runs`.

## 5. Adapters

Each adapter type has a small TypeScript interface, a registry, and a requirement: adding an adapter means one new file plus one registry line. Document this in `docs/adapters.md` with a worked example.

```ts
interface LogSourceAdapter {
  id: string;
  verify(req: RawRequest, secret: string): boolean;
  parse(payload: unknown): IncidentInput[];
  poll?(conn: Connection, since: Date): Promise<IncidentInput[]>;
}
interface RepoHostAdapter {
  getFile(ref, path): Promise<string>;
  getSnapshot(ref): Promise<Snapshot>; // tarball fetched by the backend
  searchCode(ref, query): Promise<Hit[]>;
  recentCommits(ref, paths): Promise<Commit[]>;
  commitDiff(ref, sha): Promise<string>;
  createBranch(ref, name): Promise<void>;
  commitFiles(ref, branch, files, msg): Promise<string>;
  openDraftPr(ref, args): Promise<Pr>;
  getPr(ref, number): Promise<Pr>;
  parseWebhook(req): RepoEvent | null;
}
interface SandboxProvider {
  create(opts): Promise<Sandbox>;
  // Sandbox: exec(cmd, opts), writeFile, readFile, destroy
}
```

**Implementations**

- **LogSource (MUST):** `sentry` (webhook from an internal integration, plus an optional poll using the issues API), `github-actions` (`workflow_run` webhook with conclusion failure; fetch failed jobs and the failing step logs through the API, keeping the last N lines), `generic-webhook` (JSON with a user-defined field mapping: title, message, stack, severity, commit, environment).
- **RepoHost (MUST):** `github`. Use a fine-grained token with contents (read and write), pull requests (read and write), actions (read), and metadata (read). `gitlab` is an interface stub only (COULD).
- **Sandbox (MUST):** `sandbank-daytona` or `sandbank-e2b` (whichever has a usable free tier without a card), `local-docker`, `fake`.
- **Channel (MUST):** Telegram through Chat SDK. Slack and Discord enabled by config (COULD). Check how Chat SDK handles Telegram button callbacks, which the docs mark as partial support, before building on it.

Provide `scripts/simulate-sentry.ts`, `simulate-actions.ts`, and `simulate-generic.ts` that POST fixtures to the local webhooks with valid signatures, so the demo never depends on live Sentry.

## 6. The pipeline

**6.1 Ingest.** Verify the signature, store the raw signal, enqueue a `normalize` job, and return 200 quickly.

**6.2 Normalize, correlate, triage.** As described in Section 4. No LLM calls here.

**6.3 Investigate (LLM).**

- Build context: fetch the in-app frame files at the failing commit with about 40 lines of window each, the recent commits touching those files, the suspect commit diff, the scrubbed log excerpt, and up to three similar past incidents from memory. Stay under a token budget (default 12k input).
- Run an agent with tools `readFile`, `searchCode`, `recentCommits`, and `commitDiff`. Every tool call passes through the policy engine. Cap steps (default 8).
- Output (Zod): `hypotheses[]` (statement, supporting evidence, counter-evidence, confidence 0 to 1, status leading, open, or ruled\_out), `rootCauses[]` (allow more than one for compound failures), `suspectCommit`, `affectedFiles`, `fixable`, `riskLevel`, `noiseIgnored[]`, `abstainReason?`.
- The agent must produce at least two hypotheses unless the cause is trivially clear, and must record what it checked to try to disprove each leading one. Unrelated warnings in the logs go in `noiseIgnored`.
- **Verifier pass:** a second call receives the leading hypothesis and its evidence and tries to refute it. Adjust confidence. If final confidence is below the threshold (default 0.6) or `fixable` is false, abstain: report the evidence and ask a human.

**6.4 Report.** Persist the investigation, set `awaiting_approval`, and send the chat card (Section 8).

**6.5 Fix (on Accept).**

1. Policy check, then create the sandbox. The backend fetches the repo snapshot at the failing commit and uploads the files, so no GitHub token ever enters the sandbox.
2. Detect the stack and commands. Support Node (package manager from the lockfile, `test` script, optional lint and typecheck) and Python (pytest). Prefer commands found in `.github/workflows`. Cache by lockfile hash where the provider allows.
3. Install dependencies, then reproduce the failure and store the output. If it cannot be reproduced, continue but set `reproduced: false` and lower confidence.
4. The fix agent returns edits as JSON search-and-replace blocks (`path`, `search`, `replace`) plus an explanation. Do not accept whole-file rewrites or line-number diffs.
5. Validate before applying: every `search` string matches exactly once, at most 3 files and 60 changed lines (configurable), no protected paths, no lockfile, CI, migration, or env changes unless policy allows.
6. A test-writer call produces a regression test. **Mutation check:** the test must FAIL on the original code and PASS with the patch. If not, revise or discard it.
7. Run the full test suite, lint, and typecheck where present. On failure feed the output back for at most 2 revisions (budgeted). If it still fails, set `fix_failed`, post the evidence to chat, and do not open a PR.
8. Always destroy the sandbox in a `finally` block. Record before and after outputs, the diff, timings, and token usage.

**6.6 Pull request with proof.** Create a branch `patchpilot/fix-<incident-short-id>` from the failing commit, commit the edits and the regression test with the Git Data API, and open a DRAFT PR. The description uses a fixed template: Root cause, Evidence, What changed, Validation (before and after table, commands, durations), Risk and rollback, Confidence, and a link back to the incident. Post the link to chat.

**6.7 Verify and learn.**

- Detect merges through the GitHub `pull_request` webhook (closed and merged), with polling as a fallback. Set `merged`.
- **Recurrence watch** (default 24 hours, configurable down to a couple of minutes for the demo): if the same fingerprint reappears after the merge time, set `reopened`, notify, and propose a revert PR built from the inverse of the stored edits. Otherwise set `verified_resolved`.
- Generate a postmortem (timeline, root cause, impact, fix, follow-ups) and store it as Markdown.
- Store outcomes in `memories`, including accepted and rejected fixes with the reason, and use them in later investigations.

## 7. Policy, safety, and security

- **Policy engine** (`src/policy`): `check(action, ctx)` returns `allow`, `deny`, or `needs_approval` with a reason. Actions: `read_file`, `search_code`, `create_sandbox`, `run_command`, `write_branch`, `open_pr`, `post_message`. Per-project policy: autonomy level (`notify`, `suggest`, `draft_pr`), protected path globs, size limits, severity threshold, quiet hours, and budgets (model calls, tokens, sandbox seconds, retries). A circuit breaker trips when a budget is exceeded or the same tool call repeats three times.
- **Audit log:** every policy decision and every agent action is appended with time, actor, action, inputs summary, and result. It is append-only.
- **Untrusted input:** logs, error messages, commit messages, and file contents are data, never instructions. Wrap them in clearly delimited blocks with an explicit data-only instruction. Use a fixed tool list, validate all model output with Zod, and give the model no URL fetching. Write unit tests with injection fixtures (for example a log line telling the agent to edit the CI workflow) and prove the policy denies the action.
- **Secret scrubbing:** redact common secret patterns (cloud keys, GitHub and Slack tokens, bearer tokens, private keys, JWTs, `password=` and `api_key=` values) before anything goes to the model, to chat, to a PR, or to storage.
- **Webhooks:** HMAC SHA-256 verification with timing-safe comparison for GitHub, Sentry, and the generic webhook, plus a replay window.
- **Secrets at rest:** AES-256-GCM using `ENCRYPTION_KEY`. Never log tokens.
- **Access:** the dashboard sits behind a simple password gate (`ADMIN_PASSWORD`, signed cookie). Cron endpoints require `Authorization: Bearer CRON_SECRET`. Multi-user auth is out of scope.
- **Chat approvals:** only chat users linked to the project may press buttons. Callback payloads are short ids. Actions are idempotent, so a double tap is safe, and guarded by the state machine.
- **Sandbox:** no secrets inside, CPU, memory, and time limits, auto-destroy, and provider-level egress controls where available. Where a provider cannot restrict egress, say so in `docs/security.md` instead of claiming it.

## 8. Chat experience

- **Linking:** the dashboard shows a one-time link token. The user sends `/start <token>` to the bot, and the chat is bound to the project.
- **Alert card:** title, severity, project, sources, occurrence count, likely cause with confidence, top three evidence points, suggested approach, and risk level.
- **Buttons:** View Details (link to `APP_URL/incidents/<id>`), Accept & Patch, Reject, Snooze (default 2 hours). Telegram callback data is limited to 64 bytes, so use compact ids like `i:<shortId>:a`.
- **Progress updates in the thread** after Accept: sandbox ready, failure reproduced, patch applied, tests passing, PR opened with link.
- **Other messages:** abstained (with evidence), fix failed, merged, verified resolved, reopened, stale reminder, and the weekly report. `/status` and `/incidents` commands are COULD.

## 9. Dashboard

Pages: project list, new-project wizard, project overview, incident detail, policy settings, evaluation results, and reports. Live updates by server-sent events or 3-second polling.

- **Wizard:** connect GitHub (token, repo, Test Connection), connect log sources (Sentry token, org, and project with the webhook URL and secret shown; Actions webhook instructions; generic webhook with a mapping builder), connect a channel (bot token plus link token), pick the sandbox provider, and set policy. Include a Send Test Incident button.
- **Project overview:** incident feed with status badges and filters, and stats: incidents detected, fixes proposed, accepted and rejected, PRs opened and merged, fix pass rate, MTTD, MTTR, recurrence rate, and top causes by category (recharts).
- **Incident detail:** timeline, raw and scrubbed logs, the reasoning trail (hypotheses with evidence and ruled-out items), a side-by-side diff, validation results (before and after, mutation check), sandbox logs, audit entries, postmortem, and Accept, Reject, and Snooze buttons that mirror chat.
- Clean design, good empty states, and loading and error states throughout.

## 10. Scheduler and proactive jobs

Three protected endpoints, so the free Cloud Scheduler limit of 3 jobs is enough:

1. `/api/cron/maintenance` (every 15 minutes): poll sources that cannot send webhooks, poll PR states, and run the recurrence watch.
2. `/api/cron/stale-check` (every 12 hours): remind chat about incidents and PRs left unreviewed.
3. `/api/cron/weekly-report`: post and store a reliability summary.

Provide `pnpm cron:run <job>` so the demo can trigger each one by hand.

## 11. Evaluation harness

Build `eval/` with about 10 cases of tiny Node and Python projects, each with passing tests plus an injected bug. A `case.json` holds the id, category, true root cause (file and symbol), the signal fixture, the expected outcome (`fix` or `abstain`), and noise settings.

Cover: off-by-one, null handling, wrong operator, missing await, a compound failure with two bugs, noisy logs, a missing env var (expect abstain), a dependency problem (expect abstain), a flaky test (expect abstain), and a prompt-injection log.

`pnpm eval` runs the real pipeline in eval mode (auto-approve, GitHub replaced by a local git repo or an in-memory fake) and writes `eval/results/<timestamp>.json` plus a Markdown table. Metrics: resolution rate (regression test valid, suite passes, mutation check passes), root-cause accuracy (file and symbol match), false-positive rate (fixes attempted on abstain cases), abstention precision and recall, average tokens and estimated cost, and time per case. Respect the shared rate limiter, support `--cases` to run a subset, and cache model results so reruns are cheap. The dashboard `/eval` page shows the latest run.

## 12. Phases and acceptance criteria

**Phase 0: Scaffold.** Repo, tooling, env handling, Drizzle schema and migrations, logging, `docs/decisions.md`, `PROGRESS.md`. *Accept:* `pnpm dev` and `pnpm worker` start, and `pnpm test` runs.

**Phase 1: Domain and ingest.** Schemas, state machine, fingerprint, correlation, triage (with unit tests), the three log source adapters with signature checks, fixtures, and simulate scripts. *Accept:* posting a fixture creates one incident, and posting it again dedupes.

**Phase 2: GitHub, context, policy skeleton.** GitHub adapter, context builder, secret scrubber, and the policy engine with the audit log. *Accept:* context for a fixture incident is built and scrubbed, and every tool call is policy-checked.

**Phase 3: Investigation.** Rate limiter (shared token bucket configured to the free tier, default 10 requests per minute and 250 per day, with backoff on 429), model fallback, investigator, verifier, and abstention. *Accept:* fixtures produce hypotheses with ruled-out items, and a mocked-model test suite passes.

**Phase 4: Chat.** Telegram through Chat SDK, link flow, alert card, buttons, idempotency, and the state machine. *Accept:* tapping Accept in Telegram moves the incident to `fixing`, and tapping twice does not double-run.

**Phase 5: Sandbox and fix.** `SandboxProvider` with Sandbank, local Docker, and fake implementations, stack detection, reproduce, fix agent, edit validator, test writer, mutation check, retries, and PR with proof. *Accept:* the demo app bug is fixed with a validated draft PR.

**Phase 6: Verification loop.** Merge detection, recurrence watch, revert proposal, postmortem, and memory. *Accept:* merging the PR marks it `merged`, then `verified_resolved`, and a simulated recurrence marks it `reopened`.

**Phase 7: Dashboard.** All pages in Section 9. *Accept:* the full flow is usable without the terminal.

**Phase 8: Hardening.** Injection tests, the invariant test (no repo change without approval), budget and circuit-breaker tests, and `docs/security.md`. *Accept:* all pass.

**Phase 9: Scheduler.** The three cron endpoints and `cron:run`. *Accept:* each job runs by hand and does its work.

**Phase 10: Evaluation.** The cases, runner, results page, and `docs/eval.md`. *Accept:* `pnpm eval` produces a results table.

**Phase 11: Polish (SHOULD and COULD).** Slack and Discord enablement, `/status` command, UI reproduction with before and after screenshots through a headless browser, GitLab stub, README, architecture diagram in Mermaid, and the demo script.

## 13. Configuration

`GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GEMINI_RPM`, `GEMINI_RPD`, `GITHUB_TOKEN` (or per-project in the DB), `GITHUB_WEBHOOK_SECRET`, `SENTRY_WEBHOOK_SECRET`, `TELEGRAM_BOT_TOKEN`, `SLACK_*` and `DISCORD_*` (optional), `SANDBOX_PROVIDER` (`daytona`, `e2b`, `local-docker`, or `fake`), `DAYTONA_API_KEY` or `E2B_API_KEY`, `DATABASE_URL`, `APP_URL`, `ENCRYPTION_KEY`, `ADMIN_PASSWORD`, `CRON_SECRET`, `RECURRENCE_WINDOW_MINUTES`. Validate env with Zod at startup and fail with a clear message.

## 14. Demo and deliverables

- **Demo app:** `fixtures/demo-app` is a small Node app with tests and a GitHub Actions workflow, seeded with one realistic bug. `pnpm demo:seed` pushes it to a repo of the user's choosing and prints the next steps.
- **Demo flow:** a failure arrives from Sentry and GitHub Actions and merges into one incident, then the Telegram card arrives, I tap Accept, the sandbox reproduces and fixes it, a draft PR opens with proof, I merge it, and the dashboard shows verified resolved. Then show the eval results.
- **Deliverables:** source code, `README.md` (setup, env, run, demo, architecture diagram), `docs/architecture.md`, `docs/adapters.md`, `docs/security.md`, `docs/eval.md`, `docs/decisions.md`, `.env.example`, and `docs/demo-script.md` covering the problem and thought process, the solution design, the live demo, and a code walkthrough of frontend and backend.

## 15. Definition of done

- The full demo flow runs end to end from the UI and from Telegram.
- All MUST items work, and every SHOULD or COULD item is either done or listed as skipped in `PROGRESS.md` with a reason.
- Typecheck, lint, and tests pass, including the invariant and injection tests.
- No secret is committed, and `.env.example` is complete.
- `pnpm eval` produces real numbers, and the README reports them honestly, including failures.
- Adding a new log source takes one file and one registry line, proven by the worked example in `docs/adapters.md`.
