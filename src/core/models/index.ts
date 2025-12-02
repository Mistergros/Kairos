export interface Risk { id: string; name: string; category: string; description: string; subrisks?: string[]; units?: string[]; factors?: string[]; questions?: string[]; sources?: string[]; }
export interface Action { id: string; risk_id: string; title: string; type: 'Technique'|'Organisationnelle'|'Humaine'|'EPI'; impact: string; difficulty: 'Faible'|'Moyenne'|'Élevée'; cost: 'Faible'|'Moyen'|'Élevé'; references?: string[]; }
export interface Obligation { id: string; title: string; reference: string; applies_to_all?: boolean; naf_specific?: string[]; }
export interface UnityContext { unity: string; nafCode: string; modifiers?: Record<string, number>; features?: Record<string, any>; }
export interface RiskEvaluation { risk: Risk; severity: number; probability: number; frequency: number; control: number; score: number; }
export interface ActionPlanItem { action: Action; priority: 'Haute'|'Moyenne'|'Basse'; relatedRiskIds: string[]; }
export interface ActionPlan { items: ActionPlanItem[]; }