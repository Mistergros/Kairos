import { supabase } from "../lib/supabase";
import { createVersion, addVersionBlob } from "../repos/versionsRepo";

export async function snapshotDUERP(orgId: string, establishmentId: string, label: string, note?: string) {
  const v = await createVersion(orgId, establishmentId, label, note);
  const [inv, act] = await Promise.all([
    supabase.from("assessments").select("*").eq("org_id", orgId).eq("establishment_id", establishmentId),
    supabase.from("actions").select("*").eq("org_id", orgId).eq("establishment_id", establishmentId),
  ]);
  if (inv.error) throw inv.error;
  if (act.error) throw act.error;
  await addVersionBlob(v.id, "inventory", inv.data || []);
  await addVersionBlob(v.id, "actions", act.data || []);
  return v;
}
