/**
 * supabaseSync.ts
 *
 * Stratégie : localStorage = source principale (UX rapide, offline).
 * Supabase = persistance cloud, synchronisation en arrière-plan.
 *
 * loadAll(orgId)     — charge toutes les données depuis Supabase.
 * pushAll(orgId, …)  — migration initiale : pousse localStorage → Supabase.
 *
 * Chaque mutation du store appelle upsert/delete en fire-and-forget.
 * Les erreurs Supabase ne bloquent jamais l'UI.
 *
 * ⚠️  Sécurité MVP : utilise la clé anon avec org_id côté client.
 *     Avant mise en production : configurer Supabase RLS avec le JWT Clerk.
 *     Doc : https://supabase.com/docs/guides/auth/third-party/clerk
 */

import {
  listEstablishments, upsertEstablishment, deleteEstablishment,
} from "../repos/establishmentsRepo";
import {
  listWorkUnits, upsertWorkUnit, deleteWorkUnit,
} from "../repos/workUnitsRepo";
import {
  listAssessments, upsertAssessment, deleteAssessment,
} from "../repos/assessmentsRepo";
import {
  listActions, upsertAction, deleteAction,
} from "../repos/actionsRepo";
import {
  listVersions, upsertVersion,
} from "../repos/versionsRepo";
import type { Establishment, WorkUnit, Assessment, ActionItem, VersionEntry } from "../types";

export interface SyncData {
  establishments: Establishment[];
  workUnits: WorkUnit[];
  assessments: Assessment[];
  actions: ActionItem[];
  versions: VersionEntry[];
}

/** Charge tout depuis Supabase. Retourne null si Supabase non configuré ou erreur réseau. */
export async function loadAll(orgId: string): Promise<SyncData | null> {
  try {
    const [establishments, workUnits, assessments, actions, versions] = await Promise.all([
      listEstablishments(orgId),
      listWorkUnits(orgId),
      listAssessments(orgId),
      listActions(orgId),
      listVersions(orgId),
    ]);
    return { establishments, workUnits, assessments, actions, versions };
  } catch (err) {
    console.warn("[supabaseSync] loadAll failed:", err);
    return null;
  }
}

/**
 * Migration initiale : pousse les données localStorage → Supabase.
 * Appelé quand Supabase est vide mais localStorage a des données.
 */
export async function pushAll(orgId: string, data: SyncData): Promise<void> {
  try {
    await Promise.all([
      ...data.establishments.map((e) => upsertEstablishment(orgId, e).catch(console.error)),
      ...data.workUnits.map((u) => upsertWorkUnit(orgId, u).catch(console.error)),
      ...data.assessments.map((a) => upsertAssessment(orgId, a).catch(console.error)),
      ...data.actions.map((a) => upsertAction(orgId, a).catch(console.error)),
      ...data.versions.map((v) => upsertVersion(orgId, v).catch(console.error)),
    ]);
  } catch (err) {
    console.warn("[supabaseSync] pushAll failed:", err);
  }
}

// Re-export individual upsert/delete for store fire-and-forget calls
export {
  upsertEstablishment, deleteEstablishment,
  upsertWorkUnit, deleteWorkUnit,
  upsertAssessment, deleteAssessment,
  upsertAction, deleteAction,
  upsertVersion,
};
