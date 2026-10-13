# PatchPilot Architectural Decisions

This document records architectural, technical, and implementation decisions made throughout development.

---

## Decision 1: SQLite + Drizzle ORM for Zero-Friction Portability
- **Context:** Free-tier guideline forbids requiring paid Cloud SQL or Redis services.
- **Decision:** Use SQLite via `better-sqlite3` with `drizzle-orm`.
- **Consequence:** Zero local configuration needed. Job queue is handled via a dedicated `jobs` table polled by `worker/index.ts`. Schema uses standard SQL types that translate directly to PostgreSQL or Google Cloud Firestore.

## Decision 2: Queue Engine via DB Jobs Table
- **Context:** Avoid Redis dependency to keep local and cloud free tier completely self-contained.
- **Decision:** Implement a transactional polling worker in `worker/index.ts` with exponential backoff, retry limits, and status states (`queued`, `processing`, `completed`, `failed`).

## Decision 3: Vercel AI SDK with Gemini 2.5 Flash
- **Context:** Assignment utilizes free-tier Gemini API from Google AI Studio.
- **Decision:** Use `@ai-sdk/google` with `gemini-2.5-flash` (10 RPM, 250 RPD) with fallback to `gemini-2.5-flash-lite`. Rate limiting is enforced through an in-memory token bucket. Mock provider / fallback heuristics are provided for offline testing.

## Decision 4: Sandbox Provider Interface Abstraction
- **Context:** Sandbank is a young project and external cloud sandboxes like Daytona/E2B may require API tokens.
- **Decision:** Implement a unified `SandboxProvider` interface with:
  1. `FakeSandbox`: Ultra-fast deterministic sandbox for Vitest tests and CI.
  2. `LocalDockerSandbox`: Isolated container-based execution on local machine.
  3. `SandbankProvider`: Live integration when Daytona/E2B credentials exist.

## Decision 5: Human-in-the-Loop Hard Invariant
- **Context:** Safety requirement. AI agents must never mutate repositories or deploy code autonomously without human sign-off.
- **Decision:** All PR generation and code commits are strictly blocked until an incident reaches `awaiting_approval` and a human issues an explicit `accept` action via Telegram or the Web UI. A dedicated invariant test verifies this constraint.
