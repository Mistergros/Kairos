import type { Action, ActionPlan, ActionPlanItem } from "../models/action";
import type { RiskEvaluation, RiskPriority } from "../models/duerp";

const PRIORITY_WEIGHTS: Record<RiskPriority, number> = {
  critical: 1.4,
  high: 1.2,
  medium: 1,
  low: 0.6,
};

function difficultyWeight(action: Action): number {
  const level = action.difficulty.toLowerCase();
  if (["faible", "low"].includes(level)) return 1.1;
  if (["elevee", "haute", "high"].includes(level)) return 0.9;
  return 1;
}

function computeScore(evaluation: RiskEvaluation, action: Action, nafCode?: string): number {
  const base = evaluation.score || 0;
  const nafBoost = action.naf_specific && nafCode && action.naf_specific.some((code) => nafCode.startsWith(code)) ? 1.25 : 1;
  const priorityBoost = PRIORITY_WEIGHTS[evaluation.priority] ?? 1;
  const impactBoost = action.impact ? Math.min(action.impact.length / 80, 1.3) : 1;
  return Math.round(base * nafBoost * priorityBoost * difficultyWeight(action) * impactBoost);
}

export function generateActionPlan(evaluatedRisks: RiskEvaluation[], nafCode?: string): ActionPlan {
  const items = new Map<string, ActionPlanItem>();

  evaluatedRisks.forEach((evaluation) => {
    const actions = evaluation.matchedActions || [];
    actions.forEach((action) => {
      const priorityScore = computeScore(evaluation, action, nafCode);
      const existing = items.get(action.id);
      if (existing) {
        existing.priorityScore = Math.max(existing.priorityScore, priorityScore);
        if (!existing.relatedRiskIds.includes(evaluation.risk.id)) {
          existing.relatedRiskIds.push(evaluation.risk.id);
        }
        existing.nafAligned = existing.nafAligned || Boolean(action.naf_specific?.some((code) => nafCode?.startsWith(code || "")));
        return;
      }

      items.set(action.id, {
        action,
        priorityScore,
        relatedRiskIds: [evaluation.risk.id],
        nafAligned: Boolean(action.naf_specific?.some((code) => nafCode?.startsWith(code || ""))),
      });
    });
  });

  const ordered = Array.from(items.values()).sort((a, b) => {
    if (a.priorityScore !== b.priorityScore) return b.priorityScore - a.priorityScore;
    return a.action.title.localeCompare(b.action.title);
  });

  return {
    generatedAt: new Date().toISOString(),
    items: ordered,
  };
}
