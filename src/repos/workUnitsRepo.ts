import { apiGet, apiPost, apiDelete } from "../utils/apiClient";
import type { WorkUnit } from "../types";

export function dbToWorkUnit(row: any): WorkUnit {
  return {
    id: row.id,
    establishmentId: row.establishment_id,
    name: row.name || "",
    description: row.description,
    location: row.location,
    headcount: row.headcount,
    activity: row.activity,
    features: row.features || [],
    tags: row.tags || [],
    measurements: row.measurements || {},
  };
}

export async function upsertWorkUnit(_orgId: string, u: WorkUnit) {
  await apiPost("/api/work-units", u);
}

export async function deleteWorkUnit(_orgId: string, id: string) {
  await apiDelete(`/api/work-units/${encodeURIComponent(id)}`);
}

export async function listWorkUnits(_orgId: string): Promise<WorkUnit[]> {
  const rows = await apiGet<any[]>("/api/work-units");
  return (rows || []).map(dbToWorkUnit);
}
