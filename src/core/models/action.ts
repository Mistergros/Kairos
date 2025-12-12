export interface Action {
  id: string;
  risk_id?: string;
  related_risk_ids?: string[];
  title: string;
  type: string;
  difficulty: string;
  cost: string;
  naf_specific?: string[];
  impact: any;
}

export interface ActionPlanItem {
  action: Action;
  priorityScore: number;
  relatedRiskIds: string[];
  nafAligned: boolean;
}

export interface ActionPlan {
  generatedAt: string;
  items: ActionPlanItem[];
}
