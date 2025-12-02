import type { AuditRecord } from "../../core/models/duerp";

export function appendAudit(history: AuditRecord[], user: string, change: string): AuditRecord[] {
  const record: AuditRecord = { date: new Date().toISOString(), user, change };
  return [...history, record];
}
