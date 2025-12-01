import { supabase } from "../lib/supabase";

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
