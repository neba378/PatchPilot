# PatchPilot: Video Walkthrough & Presentation Script

**Deliverable for**: Step 4 – Video Recording & Code Walkthrough  
**Target Reviewer**: Kidus (`kidus@brain3.ai`)  
**Target Duration**: ~6 to 8 minutes  

---

## 🎬 Part 1: Problem Statement & Thought Process (0:00 – 1:45)

### Hook & Role Selection:
> *"Hello Kidus and the Brain3 team. For this AI Automation Assignment, I chose to automate one of the highest-friction, highest-cost roles in tech: the **Autonomous On-Call Site Reliability & Incident Remediation Engineer**.*
>
> *I deliberately avoided standard templates like HR resume parsers or basic chatbots. An on-call engineer gets paged at 3:00 AM when production microservices break or critical CI pipelines fail on main. Resolving these issues manually takes 45 to 90 minutes of stressful context switching—reading stack traces, digging through git blame, reproducing the bug locally, authoring a patch, and waiting for CI.*
> 
> *PatchPilot automates this entire lifecycle end-to-end: from real-time telemetry ingestion to root-cause investigation, interactive Telegram paging, isolated sandbox mutation testing, and verified GitHub Draft PR delivery—reducing MTTR from over an hour to under 3 minutes."*

### Key Value Proposition:
> *"In a production environment, you cannot trust AI blindly. That’s why PatchPilot is built with strict engineering invariants:
> 1. **Human Approval Invariant**: The agent cannot mutate git branches without explicit human confirmation.
> 2. **Two-Phase Mutation Testing Gate**: A newly written regression test must fail on unpatched code and pass clean post-patch before a PR is opened.
> 3. **Zero-Secret Sandbox Isolation**: The codebase is mounted into an isolated virtual volume without any production tokens or secrets."*

---

## 🛠️ Part 2: Architecture & Technical Approach (1:45 – 3:00)

### System Architecture Overview:
> *"Let’s look at the high-level architecture:*
> - *On the **Frontend**, we have a Next.js 15 (React 19) operations dashboard that gives engineering teams real-time visibility into active incidents, MTTR metrics, a multi-project switcher (`test` vs `test-2`), an interactive unified git diff viewer, and sandbox configuration controls.*
> - *On the **Backend**, we run a Node.js / Express microservice backed by SQLite WAL with Drizzle ORM, orchestrating webhook listeners, the cryptographic fingerprint deduplication engine, and our AI agents.*
> - *For **AI & LLM Integration**, we use Google Gemini 2.5 Flash via the Vercel AI SDK with structured JSON schemas, coupled with an adversarial verifier pass to eliminate hallucinations.*
> - *For **Integrations**, we use the GitHub REST API (Octokit) for repository snapshots and PR creation, the Telegram Bot API for real-time interactive push notifications, Sentry webhooks for exception telemetry, and isolated Docker/E2B sandboxes for safe execution—all fully compliant with Always Free Tier limits without requiring billing accounts."*

---

## 🚀 Part 3: Live Agent Demonstration (3:00 – 5:30)

### Step 3.1: Dashboard & Project Selection
> *"Here on the dashboard, we have our microservice projects. Let’s select our Order Service (`neba378/test-2`). Notice how the dashboard dynamically adapts to this repository."*

### Step 3.2: Triggering Incident Telemetry
> *"Let’s simulate a real-world CI failure on `main`. I’ll click **Simulate GitHub Actions**.*
> *Immediately, the backend ingests the failure payload, extracts the stack frames from `orderController.test.ts`, generates a deterministic fingerprint, and triggers the AI investigation pipeline."*

### Step 3.3: Telegram Interactive Alert Card
> *(Switch to Telegram)*  
> *"Within seconds, PatchPilot dispatches an interactive alert card to our on-call Telegram channel. Notice the card details:
> - The affected repository and branch (`neba378/test-2@main`).
> - The diagnosed defect: `TypeError: Cannot read properties of undefined (reading 'percentage')`.
> - Confidence score: `95%`.
> - Inline action buttons: `Approve Fix`, `Reject`, and `Snooze`.*
> 
> *I’ll click **Approve Fix** directly in Telegram."*

### Step 3.4: Live Sandbox Execution & Mutation Gate
> *(Switch back to Web UI / Terminal)*  
> *"Now the autonomous remediation pipeline engages in an isolated sandbox:*
> - *Step 1: Ingests the codebase snapshot and reproduces the test failure on the unpatched commit.*
> - *Step 2: Resolves `src/orderController.ts` from test telemetry and invokes Google Gemini to synthesize a minimal patch and write a targeted Vitest regression test.*
> - *Step 3: **Mutation Part A**: Injects the regression test onto unpatched code. Notice it exits with code 1, mathematically proving the test caught the defect.*
> - *Step 4: Applies the search-and-replace patch to safely dereference optional `discount.percentage`.*
> - *Step 5: **Mutation Part B**: Re-runs the test suite. All tests pass clean (exit code 0).*
> - *Step 6: Runs ESLint and TypeScript compiler (`tsc --noEmit`) to guarantee zero type errors."*

### Step 3.5: Pull Request & Evidence Preview
> *"Because all verification gates passed, PatchPilot creates branch `patchpilot/fix-inc-xxx` and drafts a GitHub Pull Request with full verification evidence, unit test logs, and the unified git diff ready for engineering review."*

---

## 💻 Part 4: Code Walkthrough (5:30 – 7:30)

### Frontend Highlights:
1. **[`src/app/page.tsx`](file:///home/nebiyu/Desktop/personal/PatchPilot/src/app/page.tsx)**:
   - Walk through the reactive project switcher, the live incident polling hook, and the modal for selecting sandbox providers (`local-docker` vs `e2b`) with custom API key persistence.
2. **[`src/app/incidents/[id]/page.tsx`](file:///home/nebiyu/Desktop/personal/PatchPilot/src/app/incidents/[id]/page.tsx)**:
   - Walk through the unified git diff viewer showing before-and-after additions/deletions, alongside the step-by-step sandbox execution log timeline.

### Backend Highlights:
1. **[`src/core/sandboxFixPipeline.ts`](file:///home/nebiyu/Desktop/personal/PatchPilot/src/core/sandboxFixPipeline.ts)**:
   - Show how `executeSandboxFix` enforces the policy check invariant before any execution.
   - Show the dynamic file candidate resolver that inspects test output stderr to pick the real controller.
   - Show the two-phase mutation test:
     ```typescript
     // Part A: Regression test must fail on unpatched code
     const prePatchTest = await sandbox.exec('npm test');
     // Part B: All tests must pass on patched code
     const postPatchTest = await sandbox.exec('npm test');
     ```
   - Show the strict verification gate that blocks PR creation if tests fail.
2. **[`src/agents/fixer.ts`](file:///home/nebiyu/Desktop/personal/PatchPilot/src/agents/fixer.ts)**:
   - Show the prompt constraints given to Gemini: search-and-replace blocks only, max 3 files, mandatory Vitest regression test, with deterministic fallback when quota limits are met.
3. **[`backend/src/routes/incidents.ts`](file:///home/nebiyu/Desktop/personal/PatchPilot/backend/src/routes/incidents.ts)**:
   - Show the clean separation of concerns, cryptographic webhook ingestion, and human approval action endpoint.

---

## 🎯 Part 5: Conclusion & Next Steps (7:30 – 8:00)

> *"In summary, PatchPilot takes a complex, high-value real-world role—On-Call SRE—and delivers an end-to-end autonomous solution that blends modern UI, robust backend microservices, multiple free APIs, proactive Telegram alerting, and mathematically verified containerized repair.*
>
> *Thank you for reviewing my Level 1 submission, and I look forward to collaborating with the team in Level 2!"*
