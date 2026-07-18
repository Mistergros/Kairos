import { apiGet, apiPost } from "../utils/apiClient";
import type { VersionEntry } from "../types";

export function dbToVersion(row: any): VersionEntry {
  return {
    id: row.id,
    establishmentId: row.establishment_id,
    label: row.label || "",
    reason: row.reason,
    hash: row.hash,
    createdAt: row.created_at,
  };
}

export async function upsertVersion(_orgId: string, v: VersionEntry) {
  await apiPost("/api/versions", v);
}

export async function listVersions(_orgId: string): Promise<VersionEntry[]> {
  const rows = await apiGet<any[]>("/api/versions");
  return (rows || []).map(dbToVersion);
}
