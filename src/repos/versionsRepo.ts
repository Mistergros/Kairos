import { supabase } from "../lib/supabase";
import type { VersionEntry } from "../types";

export function dbToVersion(row: any): VersionEntry {
  return {
    id: row.id,
    establishmentId: row.establishment_id,
    label: row.label || "",
    reason: row.reason,
    hash: row.hash,
    createdAt: row.created_at,
  };
}

function toDb(orgId: string, v: VersionEntry) {
  return {
    id: v.id,
    org_id: orgId,
    establishment_id: v.establishmentId,
    label: v.label,
    reason: v.reason ?? null,
    hash: v.hash ?? null,
    created_at: v.createdAt,
  };
}

export async function upsertVersion(orgId: string, v: VersionEntry) {
  const { error } = await supabase.from("duerp_versions").upsert(toDb(orgId, v), { onConflict: "id" });
  if (error) throw error;
}

export async function listVersions(orgId: string): Promise<VersionEntry[]> {
  const { data, error } = await supabase
    .from("duerp_versions")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(dbToVersion);
}

// Kept for snapshotDUERP compatibility
export async function createVersion(orgId: string, establishmentId: string, label: string, note?: string) {
  const { data, error } = await supabase
    .from("duerp_versions")
    .insert({ org_id: orgId, establishment_id: establishmentId, label, note })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addVersionBlob(versionId: string, kind: "inventory" | "actions" | "attachments", payload: any) {
  const { error } = await supabase.from("duerp_version_blobs").insert({ version_id: versionId, kind, payload });
  if (error) throw error;
}
