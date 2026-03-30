import { supabase } from "../lib/supabase";
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

function toDb(orgId: string, u: WorkUnit) {
  return {
    id: u.id,
    org_id: orgId,
    establishment_id: u.establishmentId,
    name: u.name,
    description: u.description ?? null,
    location: u.location ?? null,
    headcount: u.headcount ?? null,
    activity: u.activity ?? null,
    features: u.features ?? [],
    tags: u.tags ?? [],
    measurements: u.measurements ?? {},
  };
}

export async function upsertWorkUnit(orgId: string, u: WorkUnit) {
  const { error } = await supabase.from("work_units").upsert(toDb(orgId, u), { onConflict: "id" });
  if (error) throw error;
}

export async function deleteWorkUnit(orgId: string, id: string) {
  const { error } = await supabase.from("work_units").delete().eq("id", id).eq("org_id", orgId);
  if (error) throw error;
}

export async function listWorkUnits(orgId: string): Promise<WorkUnit[]> {
  const { data, error } = await supabase.from("work_units").select("*").eq("org_id", orgId);
  if (error) throw error;
  return (data || []).map(dbToWorkUnit);
}
