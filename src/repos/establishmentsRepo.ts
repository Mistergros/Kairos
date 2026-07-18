import { apiGet, apiPost, apiDelete } from "../utils/apiClient";
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

export async function upsertEstablishment(_orgId: string, e: Establishment) {
  await apiPost("/api/establishments", e);
}

export async function deleteEstablishment(_orgId: string, id: string) {
  await apiDelete(`/api/establishments/${encodeURIComponent(id)}`);
}

export async function listEstablishments(_orgId: string): Promise<Establishment[]> {
  const rows = await apiGet<any[]>("/api/establishments");
  return (rows || []).map(dbToEstablishment);
}
