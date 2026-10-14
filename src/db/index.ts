// src/db/index.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'patchpilot.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Auto-initialize SQLite tables on boot if not already present
export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      repo_owner TEXT NOT NULL,
      repo_name TEXT NOT NULL,
      default_branch TEXT NOT NULL DEFAULT 'main',
      sandbox_provider TEXT NOT NULL DEFAULT 'fake',
      sandbox_api_key TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      type TEXT NOT NULL,
      encrypted_secret TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      source TEXT NOT NULL,
      raw_payload TEXT NOT NULL,
      signature TEXT,
      received_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      source TEXT NOT NULL,
      external_id TEXT,
      fingerprint TEXT NOT NULL,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      environment TEXT NOT NULL DEFAULT 'production',
      error_type TEXT,
      error_message TEXT,
      stack_frames TEXT NOT NULL DEFAULT '[]',
      log_excerpt TEXT,
      release TEXT,
      commit_sha TEXT,
      repo TEXT,
      occurred_at TEXT NOT NULL,
      detected_at TEXT NOT NULL,
      occurrences INTEGER NOT NULL DEFAULT 1,
      related_signals TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS investigations (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL REFERENCES incidents(id),
      hypotheses TEXT NOT NULL DEFAULT '[]',
      root_causes TEXT NOT NULL DEFAULT '[]',
      suspect_commit TEXT,
      affected_files TEXT NOT NULL DEFAULT '[]',
      fixable INTEGER NOT NULL DEFAULT 1,
      risk_level TEXT NOT NULL DEFAULT 'medium',
      noise_ignored TEXT NOT NULL DEFAULT '[]',
      abstain_reason TEXT,
      confidence_score INTEGER NOT NULL DEFAULT 0,
      reasoning_trail TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fix_attempts (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL REFERENCES incidents(id),
      status TEXT NOT NULL,
      sandbox_id TEXT,
      reproduced INTEGER NOT NULL DEFAULT 0,
      reproduction_output TEXT,
      edits TEXT NOT NULL DEFAULT '[]',
      diff TEXT,
      regression_test_path TEXT,
      regression_test_code TEXT,
      mutation_check_passed INTEGER NOT NULL DEFAULT 0,
      test_suite_passed INTEGER NOT NULL DEFAULT 0,
      linter_passed INTEGER NOT NULL DEFAULT 0,
      typecheck_passed INTEGER NOT NULL DEFAULT 0,
      validation_summary TEXT,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pull_requests (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL REFERENCES incidents(id),
      pr_number INTEGER,
      url TEXT NOT NULL,
      branch TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      merged_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      timestamp TEXT NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      inputs_summary TEXT NOT NULL,
      decision TEXT NOT NULL,
      result TEXT
    );

    CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      autonomy_level TEXT NOT NULL DEFAULT 'draft_pr',
      protected_paths TEXT NOT NULL DEFAULT '["migrations/**", "infra/**", ".github/**", "security/**"]',
      max_changed_files INTEGER NOT NULL DEFAULT 3,
      max_changed_lines INTEGER NOT NULL DEFAULT 60,
      model_call_budget INTEGER NOT NULL DEFAULT 10,
      sandbox_timeout_seconds INTEGER NOT NULL DEFAULT 180,
      max_retries INTEGER NOT NULL DEFAULT 2,
      circuit_breaker_tripped INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS chat_links (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      channel_type TEXT NOT NULL DEFAULT 'telegram',
      chat_id TEXT NOT NULL,
      link_token TEXT NOT NULL,
      is_linked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      incident_id TEXT REFERENCES incidents(id),
      channel_type TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      message_id TEXT,
      content TEXT NOT NULL,
      status TEXT NOT NULL,
      sent_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS postmortems (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL REFERENCES incidents(id),
      markdown TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      fingerprint TEXT NOT NULL,
      error_type TEXT,
      root_cause_summary TEXT NOT NULL,
      solution_summary TEXT NOT NULL,
      was_accepted INTEGER NOT NULL,
      rejection_reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS eval_runs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      total_cases INTEGER NOT NULL,
      resolved_count INTEGER NOT NULL,
      root_cause_accuracy INTEGER NOT NULL,
      false_positive_rate INTEGER NOT NULL,
      abstention_precision INTEGER NOT NULL,
      average_duration_ms INTEGER NOT NULL,
      average_tokens INTEGER NOT NULL,
      results_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      google_id TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      avatar_url TEXT,
      hosted_domain TEXT,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL,
      last_login_at TEXT NOT NULL
    );
  `);

  // Safe schema migrations for existing databases
  try {
    sqlite.exec("ALTER TABLE projects ADD COLUMN sandbox_api_key TEXT;");
  } catch {}
}

// Run initial migration
initDb();
