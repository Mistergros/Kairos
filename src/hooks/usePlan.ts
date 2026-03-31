import { useUser } from "@clerk/clerk-react";

export type PlanId = "starter" | "pme" | "consultants";

export type PlanLimits = {
  planId: PlanId;
  maxWorkUnits: number;   // -1 = illimité
  maxEstablishments: number;
  canExportXLSX: boolean;
  canSeeFullHistory: boolean;
  label: string;
};

const PLAN_CONFIG: Record<PlanId, PlanLimits> = {
  starter: {
    planId: "starter",
    maxWorkUnits: 5,
    maxEstablishments: 1,
    canExportXLSX: false,
    canSeeFullHistory: false,
    label: "Starter",
  },
  pme: {
    planId: "pme",
    maxWorkUnits: 20,
    maxEstablishments: 5,
    canExportXLSX: true,
    canSeeFullHistory: true,
    label: "PME",
  },
  consultants: {
    planId: "consultants",
    maxWorkUnits: -1,
    maxEstablishments: -1,
    canExportXLSX: true,
    canSeeFullHistory: true,
    label: "Consultants",
  },
};

const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === "true";

export function usePlan(): PlanLimits {
  const { user } = useUser();

  if (bypassAuth) return PLAN_CONFIG["consultants"];

  const raw = (user?.publicMetadata as any)?.planId as string | undefined;
  const planId = (raw?.toLowerCase() as PlanId) || "starter";
  return PLAN_CONFIG[planId] ?? PLAN_CONFIG["starter"];
}
