# PatchPilot Video Presentation & Demo Script

**Candidate:** Nebiyu Musbah  
**Project:** PatchPilot – AI On-Call DevOps & Remediation Agent  
**Submission To:** Kidus (`kidus@brain3.ai`)  
**Target Duration:** 5 to 7 Minutes  

---

## ⏱️ Timeline & Presentation Flow

### 1. Introduction & Problem Statement (0:00 – 1:15)
- **Visual:** Camera on you, dashboard header visible.
- **Script:**
  > *"Hi Kidus, my name is Nebiyu, and today I'm presenting **PatchPilot**, an autonomous AI On-Call DevOps and Remediation Agent built for the Level 1 AI Automation assignment.*
  >
  > *When choosing a role, I deliberately steered clear of standard templates like recruiting or generic chatbots. Instead, I tackled one of the most draining pain points in software engineering: **the on-call developer rotation**.*
  >
  > *When production throws a 500 error or a deployment fails at 2 AM, someone has to wake up, read raw stack traces, search git blame, write a hotfix, and test it under pressure. Most existing AI SRE tools stop at diagnosis, and generic coding agents open unverified PRs that risk breaking production further.*
  >
  > *PatchPilot takes over the first mile and the last mile: it ingests telemetry from multiple tools, formulates competing hypotheses to find the true root cause, proves the fix in an isolated sandbox with a newly authored regression test, and drafts a PR with full proof attached—all with strict human-in-the-loop governance."*

---

### 2. Architecture & The 5 Key Differentiators (1:15 – 2:30)
- **Visual:** Screen showing Mermaid diagram in `docs/architecture.md`.
- **Script:**
  > *"PatchPilot is built around five core differentiators:
  > 1. **Vendor-Neutral Adapters:** Sentry, GitHub Actions, and generic webhooks all normalize into a single Incident schema. Adding a new monitoring tool is just one file.
  > 2. **Investigation by Falsification:** Rather than guessing the first plausible explanation, our Gemini 2.5 Flash agent generates competing hypotheses and actively seeks out disproving evidence before making a recommendation.
  > 3. **Sandbox-Verified Fixes with Mutation Testing:** We never propose a fix we haven't executed. The agent authors a regression test, confirms that it FAILS on the unpatched code, applies search-and-replace edits, and proves it PASSES on the patched code.
  > 4. **Governed Autonomy & Hard Invariants:** PatchPilot NEVER auto-merges or auto-deploys. Every repository modification requires human sign-off, protected paths like migrations are blacklisted, and all actions are recorded in an append-only audit log.
  > 5. **Measured Quality:** A built-in evaluation harness runs 10 diverse benchmark cases and computes resolution rates, root cause accuracy, and abstention precision."*

---

### 3. Live End-to-End Demo (2:30 – 5:00)
- **Visual:** Web UI at `http://localhost:3000` + Telegram bot / simulation terminal.
- **Script:**
  > *"Now let's see PatchPilot in action.*
  >
  > *[Step 1: Simulate Ingest]: We simulate a real production crash where customer metadata is missing in our checkout service. Both Sentry and a failing GitHub Actions run report the error.*
  >
  > *[Show Correlation]: Notice on the dashboard how PatchPilot correlates the Sentry exception and the CI failure by commit SHA and fingerprint, merging them into one unified Incident (`INC-9042`).*
  >
  > *[Show Investigation Trail]: On the incident detail page, look at the reasoning trail. The agent formulated three hypotheses: unchecked optional chaining, an upstream Stripe SDK regression, and a missing environment variable. It ruled out the latter two because the stack trace terminated before any network call, achieving a 95% confidence score on the leading hypothesis.*
  >
  > *[Show Telegram Card]: The on-call engineer receives an immediate alert on Telegram with the likely cause and four inline buttons: `View Details`, `Accept & Patch`, `Reject`, and `Snooze`.*
  >
  > *[Click Accept & Patch]: Let's click 'Accept & Patch'. Watch the live progress stream:*
  > * 1. An isolated sandbox is provisioned without exposing any GitHub tokens.
  > * 2. The failure is reproduced.
  > * 3. The agent authors a regression test: pre-patch test fails.
  > * 4. Minimal search-and-replace edits are applied.
  > * 5. Post-patch test passes, and ESLint and TypeScript compilation succeed.
  > * 6. A DRAFT pull request is opened on GitHub with the evidence attached.*
  >
  > *[Show Interactive Diff Viewer]: In the UI, the engineer can inspect the exact side-by-side diff, view the mutation test results, and click to view the draft PR on GitHub."*

---

### 4. Evaluation Benchmark & Code Walkthrough (5:00 – 6:30)
- **Visual:** Terminal running `pnpm eval` and VS Code code editor.
- **Script:**
  > *"Next, let's look at how we measure quality. When we run `pnpm eval`, PatchPilot executes our synthetic benchmark suite covering 10 scenarios:*
  > * - Off-by-one errors, null dereferences, missing awaits, and compound bugs are resolved with a 100% fix rate.
  > * - Missing env vars, dependency issues, and flaky tests are correctly identified, and the model ABSTAINS rather than guessing.
  > * - Prompt-injection attempts hidden in error logs are neutralized by our policy layer.
  >
  > *In the codebase, everything is strictly typed TypeScript. We use Next.js, Drizzle ORM with SQLite, Vercel AI SDK with Gemini 2.5 Flash, Octokit for GitHub, and an append-only audit log.*
  >
  > *Thank you Kidus, all source code, docs, and test suites are in the repository, and I look forward to Level 2!*"*
