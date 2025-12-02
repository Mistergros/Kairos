export interface Risk { id: string; name: string; category: string; description: string; }
export interface Action { id: string; risk_id: string; title: string; type: string; difficulty: string; cost: string; impact: string; }
export interface Obligation { id: string; title: string; reference: string; applies_to_all?: boolean; naf_specific?: string[]; }
export interface UnitModifiers { [riskId: string]: number; }
export interface UnitsModifiersCatalog { [unitName: string]: UnitModifiers; }
export interface FeaturesContext { solvents?: boolean; cold_room?: boolean; night_work?: boolean; public_facing?: boolean; vibrating_tools?: boolean; outdoor_uv?: boolean; machines?: boolean; }
export interface UnityContext { unity: string; nafCode: string; modifiers?: Record<string, number>; features?: FeaturesContext; }
export interface RiskEvaluation { risk: Risk; severity: number; probability: number; control: number; score: number; }
export interface ActionPlanItem { action: Action; priority: 'Haute'|'Moyenne'|'Basse'; relatedRiskIds: string[]; }
export interface ActionPlan { items: ActionPlanItem[]; }