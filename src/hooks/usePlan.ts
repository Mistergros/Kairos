import { useUser } from "@clerk/clerk-react";
import { useWorkspaceStore } from "../state/workspace";

// "free" (Découverte) = compte connecté sans abonnement actif : il construit
// son DUERP, seul le téléchargement (PDF, CSV, XLSX) demande un abonnement.
export type PlanId = "free" | "starter" | "pme" | "consultants";

export type PlanLimits = {
  planId: PlanId;
  maxWorkUnits: number;   // -1 = illimité
  maxEstablishments: number;
  canExportDocuments: boolean;
  canExportXLSX: boolean;
  canSeeFullHistory: boolean;
  canBrandDocuments: boolean; // PDF à la marque du cabinet
  maxMembers: number;         // places, propriétaire compris (Pro : + places achetées)
  label: string;
};

// Garder aligné sur PLAN_LIMITS (api/server.ts) et src/data/pricing.json.
export const PLAN_CONFIG: Record<PlanId, PlanLimits> = {
  free: {
    planId: "free",
    maxWorkUnits: 5,
    maxEstablishments: 1,
    canExportDocuments: false,
    canExportXLSX: false,
    canSeeFullHistory: false,
    canBrandDocuments: false,
    maxMembers: 1,
    label: "Découverte",
  },
  starter: {
    planId: "starter",
    maxWorkUnits: 5,
    maxEstablishments: 1,
    canExportDocuments: true,
    canExportXLSX: false,
    canSeeFullHistory: false,
    canBrandDocuments: false,
    maxMembers: 2,
    label: "Essentiel",
  },
  pme: {
    planId: "pme",
    maxWorkUnits: 20,
    maxEstablishments: 5,
    canExportDocuments: true,
    canExportXLSX: true,
    canSeeFullHistory: true,
    canBrandDocuments: false,
    maxMembers: 10,
    label: "PME",
  },
  consultants: {
    planId: "consultants",
    maxWorkUnits: -1,
    maxEstablishments: -1,
    canExportDocuments: true,
    canExportXLSX: true,
    canSeeFullHistory: true,
    canBrandDocuments: true,
    maxMembers: 5,
    label: "Pro",
  },
};

const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === "true";
// En mode démo local, VITE_DEMO_PLAN permet de tester une offre précise
// (ex. "free" pour voir le parcours gratuit jusqu'à l'export).
const demoPlan = import.meta.env.VITE_DEMO_PLAN as PlanId | undefined;

export function usePlan(): PlanLimits {
  const { user } = useUser();
  const current = useWorkspaceStore((s) => s.current);

  if (bypassAuth) return PLAN_CONFIG[demoPlan && PLAN_CONFIG[demoPlan] ? demoPlan : "consultants"];

  // Dans l'espace d'un autre (membre ou client invité), l'offre du titulaire s'applique.
  if (current && current.role !== "owner") {
    return current.active ? PLAN_CONFIG[current.planId] ?? PLAN_CONFIG.starter : PLAN_CONFIG.free;
  }

  const metadata = (user?.publicMetadata || {}) as Record<string, unknown>;
  if (metadata.subscriptionStatus !== "active") return PLAN_CONFIG.free;
  const raw = typeof metadata.planId === "string" ? metadata.planId.toLowerCase() : "starter";
  return PLAN_CONFIG[raw as PlanId] ?? PLAN_CONFIG.starter;
}
