/**
 * supabaseSync.ts
 *
 * Nom historique — ne parle plus à Supabase directement. Depuis la migration
 * vers Neon (juillet 2026), les repos (`src/repos/*.ts`) passent par l'API
 * de l'app (`api/server.ts`), authentifiée par un vrai jeton de session Clerk
 * vérifié côté serveur (voir `getClerkOrgId` dans api/server.ts) — plus sûr
 * que l'ancien accès direct au client Supabase avec la clé anon.
 *
 * Stratégie inchangée : localStorage = source principale (UX rapide, offline).
 * La base distante = persistance cloud, synchronisation en arrière-plan.
 *
 * loadAll(orgId)     — charge toutes les données depuis l'API.
 * pushAll(orgId, …)  — migration initiale : pousse localStorage → l'API.
 *
 * Chaque mutation du store appelle upsert/delete en fire-and-forget.
 * Les erreurs réseau ne bloquent jamais l'UI.
 */

import * as establishmentsRepo from "../repos/establishmentsRepo";
import * as workUnitsRepo from "../repos/workUnitsRepo";
import * as assessmentsRepo from "../repos/assessmentsRepo";
import * as actionsRepo from "../repos/actionsRepo";
import * as versionsRepo from "../repos/versionsRepo";

const { listEstablishments } = establishmentsRepo;
const { listWorkUnits } = workUnitsRepo;
const { listAssessments } = assessmentsRepo;
const { listActions } = actionsRepo;
const { listVersions } = versionsRepo;

// L'exemple « boulangerie fictive » (identifiants "demo-…", voir
// loadDemoData) reste dans le navigateur : envoyé au serveur, il occupait
// l'établissement de l'offre Découverte et son quota pendant 12 mois.
export const isDemoId = (id?: string) => Boolean(id && id.startsWith("demo-"));
const skip = Promise.resolve();

export const upsertEstablishment = (orgId: string, e: Establishment) =>
  isDemoId(e.id) ? skip : establishmentsRepo.upsertEstablishment(orgId, e);
export const deleteEstablishment = (orgId: string, id: string) =>
  isDemoId(id) ? skip : establishmentsRepo.deleteEstablishment(orgId, id);
export const upsertWorkUnit = (orgId: string, u: WorkUnit) =>
  isDemoId(u.id) || isDemoId(u.establishmentId) ? skip : workUnitsRepo.upsertWorkUnit(orgId, u);
export const deleteWorkUnit = (orgId: string, id: string) =>
  isDemoId(id) ? skip : workUnitsRepo.deleteWorkUnit(orgId, id);
export const upsertAssessment = (orgId: string, a: Assessment) =>
  isDemoId(a.workUnitId) ? skip : assessmentsRepo.upsertAssessment(orgId, a);
export const deleteAssessment = (orgId: string, id: string) => assessmentsRepo.deleteAssessment(orgId, id);
export const upsertAction = (orgId: string, a: ActionItem) =>
  isDemoId(a.establishmentId) ? skip : actionsRepo.upsertAction(orgId, a);
export const deleteAction = (orgId: string, id: string) => actionsRepo.deleteAction(orgId, id);
export const upsertVersion = (orgId: string, v: VersionEntry) =>
  isDemoId(v.establishmentId) ? skip : versionsRepo.upsertVersion(orgId, v);
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
  // Dans l'ordre des dépendances (établissement → unité → risque → action),
  // un par un : en parallèle, les clés étrangères pouvaient être refusées.
  const steps: (() => Promise<unknown>)[] = [
    ...data.establishments.map((e) => () => upsertEstablishment(orgId, e)),
    ...data.workUnits.map((u) => () => upsertWorkUnit(orgId, u)),
    ...data.assessments.map((a) => () => upsertAssessment(orgId, a)),
    ...data.actions.map((a) => () => upsertAction(orgId, a)),
    ...data.versions.map((v) => () => upsertVersion(orgId, v)),
  ];
  for (const step of steps) {
    await step().catch((err) => console.warn("[supabaseSync] pushAll:", err));
  }
}


