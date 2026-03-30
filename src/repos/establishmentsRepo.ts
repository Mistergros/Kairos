import { supabase } from "../lib/supabase";
import type { Establishment } from "../types";

export function dbToEstablishment(row: any): Establishment {
  return {
    id: row.id,
    name: row.name || "",
    siren: row.siren,
    siret: row.siret,
    codeNaf: row.code_naf,
    sector: row.sector,
    address: row.address,
    headcount: row.headcount,
  };
}

function toDb(orgId: string, e: Establishment) {
  return {
    id: e.id,
    org_id: orgId,
    name: e.name,
    siren: e.siren ?? null,
    siret: e.siret ?? null,
    code_naf: e.codeNaf ?? null,
    sector: e.sector ?? null,
    address: e.address ?? null,
    headcount: e.headcount ?? null,
  };
}

export async function upsertEstablishment(orgId: string, e: Establishment) {
  const { error } = await supabase.from("establishments").upsert(toDb(orgId, e), { onConflict: "id" });
  if (error) throw error;
}

export async function deleteEstablishment(orgId: string, id: string) {
  const { error } = await supabase.from("establishments").delete().eq("id", id).eq("org_id", orgId);
  if (error) throw error;
}

export async function listEstablishments(orgId: string): Promise<Establishment[]> {
  const { data, error } = await supabase.from("establishments").select("*").eq("org_id", orgId);
  if (error) throw error;
  return (data || []).map(dbToEstablishment);
}
