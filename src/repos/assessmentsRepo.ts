import { apiGet, apiPost, apiDelete } from "../utils/apiClient";
import type { Assessment } from "../types";

export function dbToAssessment(row: any): Assessment {
  return {
    id: row.id,
    workUnitId: row.work_unit_id,
    hazardId: row.hazard_id,
    hazardCategory: row.hazard_category,
    riskLabel: row.risk_label || "",
    damages: row.damages,
    existingMeasures: row.existing_measures,
    proposedMeasures: row.proposed_measures,
    gravity: row.gravity,
    frequency: row.frequency,
    control: row.control,
    score: row.score,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: row.source,
    sourceUrl: row.source_url,
  };
}

export async function upsertAssessment(_orgId: string, a: Assessment) {
  await apiPost("/api/assessments", a);
}

export async function deleteAssessment(_orgId: string, id: string) {
  await apiDelete(`/api/assessments/${encodeURIComponent(id)}`);
}

export async function listAssessments(_orgId: string): Promise<Assessment[]> {
  const rows = await apiGet<any[]>("/api/assessments");
  return (rows || []).map(dbToAssessment);
}
