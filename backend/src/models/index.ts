// backend/src/models/index.ts
import {
  projects,
  connections,
  signals,
  incidents,
  investigations,
  fixAttempts,
  pullRequests,
  jobs,
  auditLog,
  policies,
  chatLinks,
  messages,
  postmortems,
  memories,
  evalRuns,
  users
} from '@/db/schema';

export { db } from '@/db';
export {
  projects,
  connections,
  signals,
  incidents,
  investigations,
  fixAttempts,
  pullRequests,
  jobs,
  auditLog,
  auditLog as auditLogs,
  policies,
  chatLinks,
  messages,
  postmortems,
  memories,
  evalRuns,
  users
} from '@/db/schema';

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Connection = typeof connections.$inferSelect;
export type Signal = typeof signals.$inferSelect;
export type Incident = typeof incidents.$inferSelect;
export type Investigation = typeof investigations.$inferSelect;
export type FixAttempt = typeof fixAttempts.$inferSelect;
export type PullRequest = typeof pullRequests.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type Policy = typeof policies.$inferSelect;
export type ChatLink = typeof chatLinks.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Postmortem = typeof postmortems.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type EvalRun = typeof evalRuns.$inferSelect;
export type User = typeof users.$inferSelect;
