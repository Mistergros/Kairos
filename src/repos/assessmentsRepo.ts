import { supabase } from "../lib/supabase";

export async function addAssessment(row: {
  orgId: string;
  establishmentId: string;
  workUnitId: string;
  hazardId: string;
  hazardCategory?: string;
  riskLabel?: string;
  damages?: string;
  gravity: number;
  frequency: number;
  control: number;
  priority: number;
  existingMeasures?: string;
  proposedMeasures?: string;
}) {
  const { data, error } = await supabase
    .from("assessments")
    .insert({
      org_id: row.orgId,
      establishment_id: row.establishmentId,
      work_unit_id: row.workUnitId,
      hazard_id: row.hazardId,
      hazard_category: row.hazardCategory,
      risk_label: row.riskLabel,
      damages: row.damages,
      gravity: row.gravity,
      frequency: row.frequency,
      control: row.control,
      priority: row.priority,
      existing_measures: row.existingMeasures,
      proposed_measures: row.proposedMeasures,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
