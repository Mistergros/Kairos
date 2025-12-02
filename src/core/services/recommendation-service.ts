import { generateActionPlan } from "../engine/recommendation-engine";
import type { ActionPlan } from "../models/action";
import type { RiskEvaluation } from "../models/duerp";

export class RecommendationService {
  generate(evaluatedRisks: RiskEvaluation[], nafCode?: string): ActionPlan {
    return generateActionPlan(evaluatedRisks, nafCode);
  }
}
