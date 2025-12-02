import type { Action, ActionPlan } from "./action";
import type { Risk } from "./risk";
import type { Unity } from "./unity";
import type { Obligation } from "./legal";

export type RiskPriority = "critical" | "high" | "medium" | "low";

export interface RiskEvaluation {
  risk: Risk;
  unity: Unity;
  severity: number;
  probability: number;
  control: number;
  score: number;
  priority: RiskPriority;
  matchedActions?: Action[];
  obligations?: Obligation[];
}

export interface AuditRecord {
  date: string;
  user: string;
  change: string;
}

export interface DUERP {
  id: string;
  year: number;
  companyName: string;
  nafCode: string;
  units: Unity[];
  risks: RiskEvaluation[];
  actions: Action[];
  history: AuditRecord[];
  actionPlan?: ActionPlan;
}
