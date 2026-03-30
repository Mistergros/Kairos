import { supabase } from "../lib/supabase";
import type { ActionItem } from "../types";

export function dbToAction(row: any): ActionItem {
  return {
    id: row.id,
    establishmentId: row.establishment_id,
    assessmentId: row.assessment_id,
    title: row.title || "",
    description: row.description,
    owner: row.owner,
    startDate: row.start_date,
    dueDate: row.due_date,
    endDate: row.end_date,
    how: row.how,
    status: row.status || "TO_DO",
    priority: row.priority,
    cost: row.cost,
    evidenceUrl: row.evidence_url,
    steps: row.steps || [],
    createdAt: row.created_at,
  };
}

function toDb(orgId: string, a: ActionItem) {
  return {
    id: a.id,
    org_id: orgId,
    establishment_id: a.establishmentId ?? null,
    assessment_id: a.assessmentId ?? null,
    title: a.title,
    description: a.description ?? null,
    owner: a.owner ?? null,
    start_date: a.startDate ?? null,
    due_date: a.dueDate ?? null,
    end_date: a.endDate ?? null,
    how: a.how ?? null,
    status: a.status,
    priority: a.priority,
    cost: a.cost ?? null,
    evidence_url: a.evidenceUrl ?? null,
    steps: a.steps ?? [],
    created_at: a.createdAt,
  };
}

export async function upsertAction(orgId: string, a: ActionItem) {
  const { error } = await supabase.from("actions").upsert(toDb(orgId, a), { onConflict: "id" });
  if (error) throw error;
}

export async function deleteAction(orgId: string, id: string) {
  const { error } = await supabase.from("actions").delete().eq("id", id).eq("org_id", orgId);
  if (error) throw error;
}

export async function listActions(orgId: string): Promise<ActionItem[]> {
  const { data, error } = await supabase.from("actions").select("*").eq("org_id", orgId);
  if (error) throw error;
  return (data || []).map(dbToAction);
}
