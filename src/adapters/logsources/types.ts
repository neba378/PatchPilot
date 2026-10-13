// src/adapters/logsources/types.ts
import { IngestIncidentInput } from '../../core/correlation';

export interface RawRequest {
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
  body?: any;
}

export interface LogSourceAdapter {
  id: string;
  verify(req: RawRequest, secret: string): boolean;
  parse(payload: unknown, projectId?: string): IngestIncidentInput[];
  poll?(conn: any, since: Date): Promise<IngestIncidentInput[]>;
}
