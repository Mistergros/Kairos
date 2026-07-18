import { apiGet, apiPost, apiDelete } from "../utils/apiClient";
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

export async function upsertAction(_orgId: string, a: ActionItem) {
  await apiPost("/api/actions", a);
}

export async function deleteAction(_orgId: string, id: string) {
  await apiDelete(`/api/actions/${encodeURIComponent(id)}`);
}

export async function listActions(_orgId: string): Promise<ActionItem[]> {
  const rows = await apiGet<any[]>("/api/actions");
  return (rows || []).map(dbToAction);
}
