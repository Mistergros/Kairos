// Changement d'offre : correspondance tarif Stripe → offre, et ordre des offres.
// Module sans dépendance (testable seul, voir scripts/tests/plans.ts).

export const PLAN_ORDER = ["starter", "pme", "consultants"] as const;
export type PaidPlan = (typeof PLAN_ORDER)[number];

export const isPaidPlan = (value: unknown): value is PaidPlan => PLAN_ORDER.includes(value as PaidPlan);

export const planRank = (plan: string) => PLAN_ORDER.indexOf(plan as PaidPlan);

// Retrouve l'offre d'un abonnement à partir de son tarif. Indispensable quand
// le client change d'offre depuis le portail Stripe : les métadonnées de
// l'abonnement gardent alors l'ancienne offre, seul le tarif fait foi.
export const planIdFromPrice = (priceId: string | null | undefined, prices: Record<PaidPlan, (string | undefined)[]>) => {
  if (!priceId) return null;
  for (const plan of PLAN_ORDER) {
    if (prices[plan].some((p) => p && p === priceId)) return plan;
  }
  return null;
};
