import type { AuditRecord, DUERP } from "../models/duerp";

export class AuditService {
  log(duerp: DUERP, user: string, change: string): AuditRecord {
    const record: AuditRecord = { date: new Date().toISOString(), user, change };
    duerp.history.push(record);
    return record;
  }
}
