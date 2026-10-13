# PatchPilot Technical Architecture & System Design

**Author:** Nebiyu Musbah  
**System:** PatchPilot (AI On-Call DevOps & Remediation Agent)  

---

## 1. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph ExternalSources["External Telemetry & Monitoring Sources"]
        Sentry["Sentry Error Webhooks"]
        GHA["GitHub Actions Failure Webhooks"]
        Generic["Generic JSON Error Webhooks"]
    end

    subgraph IngestLayer["Ingestion & Core Triage Engine"]
        Gateway["Next.js API Routes /api/webhooks/*"]
        Scrubber["Secret Scrubber & Injection Guard"]
        Correlation["Correlation & Deduplication Engine (24h Fingerprints)"]
        Triage["Rule-Based Triage (code_bug, infra, config, flaky_test)"]
    end

    subgraph DataQueue["Persistence & Job Queue Layer"]
        SQLite[("SQLite Database via Drizzle ORM")]
        JobsQueue["Jobs Table (Transactional Queue)"]
        Worker["Async Node Worker (worker/index.ts)"]
    end

    subgraph AgentLayer["AI Reasoning & Verification Layer"]
        Context["Context Builder (Files, Blame, Commits, Memory)"]
        Limiter["Token Bucket Rate Limiter (10 RPM / 250 RPD)"]
        Gemini["Gemini 2.5 Flash (via Google AI Studio)"]
        Investigator["Investigator Agent (Competing Hypotheses)"]
        Verifier["Verifier Agent (Adversarial Falsification Pass)"]
    end

    subgraph HumanApproval["Human-in-the-Loop & Notification Layer"]
        Telegram["Telegram Bot (Chat SDK with 4 Inline Action Buttons)"]
        WebUI["Next.js React Dashboard (Live Incidents, Diff, Eval)"]
        Human{"On-Call Engineer"}
    end

    subgraph SandboxLayer["Isolated Sandbox & Validation Engine"]
        SandboxProv["Sandbox Provider (Fake / LocalDocker / Sandbank)"]
        Repro["Reproduction Runner (Pre-Patch Fails)"]
        Fixer["Fixer Agent (Search-and-Replace Blocks)"]
        Mutation["Mutation Check (Regression Test Post-Patch Passes)"]
        Linter["Linter & TypeCheck Validator"]
    end

    subgraph Remediate["Remediation & Governance Layer"]
        Policy["Security Policy Engine (Protected Paths, Hard Invariants)"]
        Audit["Append-Only Audit Log"]
        GitHub["GitHub REST API (Octokit)"]
        DraftPR["DRAFT Pull Request with Proof"]
    end

    Sentry --> Gateway
    GHA --> Gateway
    Generic --> Gateway

    Gateway --> Scrubber
    Scrubber --> Correlation
    Correlation --> Triage
    Triage --> SQLite
    Triage --> JobsQueue

    JobsQueue --> Worker
    Worker --> Context
    Context --> Limiter
    Limiter --> Gemini
    Gemini --> Investigator
    Investigator --> Verifier
    Verifier --> Telegram
    Verifier --> WebUI

    Telegram --> Human
    WebUI --> Human

    Human --"Accept & Patch"--> Policy
    Policy --> SandboxProv
    SandboxProv --> Repro
    Repro --> Fixer
    Fixer --> Mutation
    Mutation --> Linter
    Linter --> DraftPR
    DraftPR --> GitHub
    Policy --> Audit
```

---

## 2. Core Subsystems

### 2.1 Standardized Incident Schema
Every telemetry source is normalized to a common schema:
- `fingerprint`: SHA256 of error type, normalized message, and top in-app stack frame. Volatile UUIDs, numbers, and hex strings are scrubbed to prevent alert duplication.
- `occurrences`: Incremented automatically when the same fingerprint is detected within 24 hours.
- `relatedSignals`: Correlated multi-source signals (e.g. Sentry error + failed GitHub Action run) occurring on the same commit SHA within 30 minutes.

### 2.2 Adversarial Falsification Investigation
Unlike naive agents that accept the first plausible theory, PatchPilot formulates multiple **competing hypotheses** and actively seeks evidence to disprove them. If confidence remains below 60% or tests cannot reproduce the failure, PatchPilot abstains and escalates with full evidence to human engineers.

### 2.3 Isolated Sandbox Validation & Mutation Testing
1. No GitHub credentials enter the sandbox.
2. A regression test is generated and tested against the pre-patch code (must fail).
3. Search-and-replace edits are applied and tested against the regression test (must pass).
4. Code passes linter and typecheck before PR creation.

### 2.4 Governance & Hard Invariants
- `merge_pr` and `deploy_code` are strictly denied in code.
- Repository mutation requires `humanApproved: true`.
- Protected directories (`migrations/`, `infra/`, `.github/`) are blocked.
- Append-only audit logging for every agent action.
