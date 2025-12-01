import { supabase } from "../lib/supabase";

export type DUActionStatus = "À faire" | "En cours" | "Terminé";

export async function addAction(row: {
  orgId: string;
  establishmentId: string;
  workUnitId: string;
  assessmentId?: string | null;
  title: string;
  priority: 1 | 2 | 3 | 4;
  owner?: string;
  dueDate?: string;
  status?: DUActionStatus;
  cost?: string;
  evidenceUrl?: string;
}) {
  const { data, error } = await supabase
    .from("actions")
    .insert({
      org_id: row.orgId,
      establishment_id: row.establishmentId,
      work_unit_id: row.workUnitId,
      assessment_id: row.assessmentId,
      title: row.title,
      priority: row.priority,
      owner: row.owner,
      due_date: row.dueDate,
      status: row.status ?? "À faire",
      cost: row.cost,
      evidence_url: row.evidenceUrl,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
