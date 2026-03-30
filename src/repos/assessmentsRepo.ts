import { supabase } from "../lib/supabase";
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
  };
}

function toDb(orgId: string, a: Assessment) {
  return {
    id: a.id,
    org_id: orgId,
    work_unit_id: a.workUnitId,
    hazard_id: a.hazardId ?? null,
    hazard_category: a.hazardCategory ?? null,
    risk_label: a.riskLabel ?? null,
    damages: a.damages ?? null,
    existing_measures: a.existingMeasures ?? null,
    proposed_measures: a.proposedMeasures ?? null,
    gravity: a.gravity,
    frequency: a.frequency,
    control: a.control,
    score: a.score,
    priority: a.priority,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

export async function upsertAssessment(orgId: string, a: Assessment) {
  const { error } = await supabase.from("assessments").upsert(toDb(orgId, a), { onConflict: "id" });
  if (error) throw error;
}

export async function deleteAssessment(orgId: string, id: string) {
  const { error } = await supabase.from("assessments").delete().eq("id", id).eq("org_id", orgId);
  if (error) throw error;
}

export async function listAssessments(orgId: string): Promise<Assessment[]> {
  const { data, error } = await supabase.from("assessments").select("*").eq("org_id", orgId);
  if (error) throw error;
  return (data || []).map(dbToAssessment);
}
