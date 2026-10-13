# PatchPilot Security, Guardrails & Policy Architecture

This document outlines the security architecture, threat model, and governance guardrails enforced by PatchPilot.

---

## 1. Hard Human-in-the-Loop Invariants

1. **NO AUTONOMOUS DEPLOYMENT:** PatchPilot is structurally and programmatically forbidden from running `git push --force`, merging pull requests, or deploying containers to production. All code actions terminate at a **DRAFT Pull Request**.
2. **NO UNAPPROVED REPO MUTATION:** Branch creation and draft PR authoring require explicit human approval (`humanApproved: true`), issued either through the Web Dashboard or via Telegram interactive inline buttons.
3. **POLICY ENFORCEMENT LAYER:** Every single agent tool invocation passes through `src/policy/engine.ts`. If an action violates policy constraints, it is immediately denied and logged to the append-only audit trail.

---

## 2. Threat Modeling & Protections

### 2.1 Untrusted Input & Prompt Injection
Error messages, exception stack traces, commit messages, and third-party webhook payloads are treated as **untrusted data, never instructions**.
- Untrusted data is wrapped in strict `<UNTRUSTED_EXTERNAL_DATA>` XML boundary delimiters with explicit negative prompting.
- The `src/policy/injectionGuards.ts` module scans incoming error text for common prompt hijacking phrases (`ignore all previous instructions`, `system override`, `modify .github/workflows`). If detected, the agent immediately abstains.

### 2.2 Protected Paths & Blast Radius Limiting
The policy engine enforces a strict blacklist of protected repository paths:
- `migrations/**` (Database migrations)
- `infra/**` (Terraform, Pulumi, Kubernetes manifests)
- `.github/workflows/**` (CI/CD pipelines)
- `security/**` & `.env` (Security configs and secrets)

Any patch attempting to edit more than **3 files** or **60 total lines** is blocked by default to prevent large, unreviewable diffs.

### 2.3 Secret Scrubbing & Redaction
Before any code excerpt, log trace, or diff is sent to an LLM, written to database storage, or dispatched to Telegram/Slack, it passes through `src/policy/scrubber.ts`. Common secret patterns (GitHub PATs, AWS Access Keys, Bearer tokens, private keys, JWTs, and API keys) are masked with `[REDACTED_SECRET]`.

### 2.4 Sandbox Isolation & Token Isolation
- **No GitHub tokens inside sandbox:** The backend fetches repository snapshots and passes files directly into the sandbox filesystem. The sandbox has zero knowledge of GitHub tokens or Cloud credentials.
- Sandboxes are automatically destroyed in a `finally` block upon completion or failure.
- In environments where network egress cannot be restricted at the container level (e.g. basic local docker without iptables), PatchPilot operates in strict local snapshot mode.

### 2.5 Circuit Breakers & Budget Caps
- Token bucket rate limiter restricts Gemini API calls to 10 RPM and 250 RPD (staying strictly within the free tier).
- Repetitive tool call detector trips the circuit breaker if the agent requests the same tool with identical parameters 3 consecutive times, preventing runaway loops.
