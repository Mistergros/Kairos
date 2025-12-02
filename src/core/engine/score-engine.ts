import scoring from "../../config/scoring.json";
import type { RiskEvaluation, RiskPriority } from "../models/duerp";
import type { Risk } from "../models/risk";
import type { UnityContext } from "../models/unity";

interface ScoringConfig {
  severity: Record<string, number>;
  probability: Record<string, number>;
  control: Record<string, number>;
  priorityThresholds: {
    critical: number;
    high: number;
    medium: number;
  };
}

const scoringConfig = scoring as ScoringConfig;

function computePriority(score: number): RiskPriority {
  if (score >= scoringConfig.priorityThresholds.critical) return "critical";
  if (score >= scoringConfig.priorityThresholds.high) return "high";
  if (score >= scoringConfig.priorityThresholds.medium) return "medium";
  return "low";
}

export function evaluateRisk(risk: Risk, context: UnityContext): RiskEvaluation {
  const severity = Number.isFinite(context.severity) ? context.severity : scoringConfig.severity.medium;
  const probability = Number.isFinite(context.probability) ? context.probability : scoringConfig.probability.possible;
  const control = Number.isFinite(context.control) && context.control > 0 ? context.control : scoringConfig.control.standard;

  const score = Math.round(severity * probability * control);
  const priority = computePriority(score);

  return {
    risk,
    unity: context.unity,
    severity,
    probability,
    control,
    score,
    priority,
  };
}
