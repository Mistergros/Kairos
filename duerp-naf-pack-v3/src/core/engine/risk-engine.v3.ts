import fs from 'fs';
import path from 'path';
import type { Risk, Action, Obligation, UnitsModifiersCatalog, UnityContext, RiskEvaluation, ActionPlan } from '../models';

type ScoringCfg = { severity_scale: number[]; probability_scale: number[]; control_scale: number[]; formula: string; };
type ConditionalRules = { schema: any; rules: Array<{ if: Record<string, any>; add_risks?: string[]; add_actions?: string[]; add_obligations?: string[]; }>; };

export class RiskEngineV3 {
  private baseConfigPath: string;
  private risks: Risk[] = [];
  private actions: Action[] = [];
  private obligations: Obligation[] = [];
  private scoring: ScoringCfg | null = null;
  private unitsModifiers: UnitsModifiersCatalog = {};
  private conditional: ConditionalRules | null = null;

  constructor(baseConfigPath?: string) {
    this.baseConfigPath = baseConfigPath || path.join(process.cwd(), 'config');
    this.loadCatalogs();
  }

  private loadJSON<T = any>(rel: string): T {
    const p = path.join(this.baseConfigPath, rel);
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw) as T;
  }
  private tryLoadJSON<T = any>(rel: string): T | null {
    const p = path.join(this.baseConfigPath, rel);
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw) as T;
  }
  private loadCatalogs() {
    this.risks = this.loadJSON<Risk[]>('risks.catalog.json');
    this.actions = this.loadJSON<Action[]>('actions.catalog.json');
    this.obligations = this.loadJSON<Obligation[]>('obligations.catalog.json');
    this.scoring = this.loadJSON<ScoringCfg>('scoring.json');
    this.unitsModifiers = this.tryLoadJSON<UnitsModifiersCatalog>('units.modifiers.json') || {};
    this.conditional = this.tryLoadJSON<ConditionalRules>('rules/conditional.json');
  }
  private listNafFiles(): string[] {
    const nafDir = path.join(this.baseConfigPath, 'naf');
    if (!fs.existsSync(nafDir)) return [];
    return fs.readdirSync(nafDir).filter(f => f.endsWith('.json'));
  }
  public getNAFProfile(nafCode: string): any | null {
    const files = this.listNafFiles();
    for (const f of files) {
      const content = this.loadJSON<any>(path.join('naf', f));
      if (content.naf && String(content.naf).startsWith(nafCode)) return content;
      if (content.naf === nafCode) return content;
    }
    return null;
  }
  private applyConditional(context: UnityContext, risksSet: Set<string>, actionsSet: Set<string>, obligationsSet: Set<string>) {
    if (!this.conditional) return;
    const features: any = context.features || {};
    for (const rule of this.conditional.rules) {
      let matched = true;
      for (const k in rule.if) {
        const parts = k.split('.'); // e.g., features.solvents
        let cur: any = context;
        for (const p of parts) { cur = cur?.[p]; }
        if (cur !== (rule.if as any)[k]) { matched = false; break; }
      }
      if (matched) {
        (rule.add_risks || []).forEach(r => risksSet.add(r));
        (rule.add_actions || []).forEach(a => actionsSet.add(a));
        (rule.add_obligations || []).forEach(o => obligationsSet.add(o));
      }
    }
  }
  public getRisksFor(nafCode: string, unity: string, ctx?: UnityContext): Risk[] {
    const profile = this.getNAFProfile(nafCode);
    const set = new Set<string>();
    if (profile?.risks_priority) profile.risks_priority.forEach((r: string) => set.add(r));
    (profile?.extra_risks || []).forEach((r: string) => set.add(r));
    this.applyConditional(ctx || { unity, nafCode }, set, new Set<string>(), new Set<string>());
    if (set.size === 0) ['R-ECRAN','R-RPS','R-INCENDIE'].forEach(r => set.add(r));
    const map = new Map(this.risks.map(r => [r.id, r]));
    return Array.from(set).map(id => map.get(id)).filter(Boolean) as Risk[];
  }
  public evaluateRisk(risk: Risk, context: UnityContext): RiskEvaluation {
    const s = this.scoring!;
    const unitMods = this.unitsModifiers[context.unity] || {};
    const mod = (context.modifiers?.[risk.id] ?? 0) + (unitMods?.[risk.id] ?? 0);
    const clamp = (v: number, arr: number[]) => Math.min(Math.max(v, arr[0]), arr[arr.length - 1]);
    const sev = clamp(2 + mod, s.severity_scale);
    const pro = clamp(2 + mod, s.probability_scale);
    const ctl = clamp(2 + (mod < 0 ? -mod : 0), s.control_scale);
    const score = sev * pro * ctl;
    return { risk, severity: sev, probability: pro, control: ctl, score };
  }
  public matchActions(risk: Risk, nafCode: string, context?: UnityContext): Action[] {
    const profile = this.getNAFProfile(nafCode) || {};
    const preferred = new Set<string>([...(profile.actions_recommended || []), ...(profile.extra_actions || [])]);
    const actionsSet = new Set<string>();
    this.applyConditional(context || { unity: '', nafCode }, new Set<string>(), actionsSet, new Set<string>());
    const byRisk = this.actions.filter(a => a.risk_id === risk.id).map(a => a.id);
    byRisk.forEach(id => actionsSet.add(id));
    const map = new Map(this.actions.map(a => [a.id, a]));
    const arr = Array.from(actionsSet).map(id => map.get(id)).filter(a => a && a.risk_id === risk.id) as Action[];
    return arr.sort((a,b) => (preferred.has(b.id) as any) - (preferred.has(a.id) as any));
  }
  public matchObligations(nafCode: string, context?: UnityContext): Obligation[] {
    const set = new Set<string>();
    const list = this.obligations.filter(o => o.applies_to_all || (o.naf_specific?.some(c => nafCode.startsWith(c))));
    list.forEach(o => set.add(o.id));
    const obSet = new Set<string>();
    this.applyConditional(context || { unity: '', nafCode }, new Set<string>(), new Set<string>(), obSet);
    obSet.forEach(id => set.add(id));
    const map = new Map(this.obligations.map(o => [o.id, o]));
    return Array.from(set).map(id => map.get(id)).filter(Boolean) as Obligation[];
  }
  public generateActionPlan(evals: RiskEvaluation[], nafCode: string, context?: UnityContext): ActionPlan {
    const itemsMap = new Map<string, { action: Action; relatedRiskIds: Set<string>; weight: number }>();
    for (const e of evals) {
      const actions = this.matchActions(e.risk, nafCode, context);
      for (const a of actions) {
        const key = a.id;
        if (!itemsMap.has(key)) {
          itemsMap.set(key, { action: a, relatedRiskIds: new Set([e.risk.id]), weight: e.score });
        } else {
          const item = itemsMap.get(key)!;
          item.relatedRiskIds.add(e.risk.id);
          item.weight += e.score;
        }
      }
    }
    const arr = Array.from(itemsMap.values()).sort((x,y) => y.weight - x.weight)
      .map(it => ({ action: it.action, relatedRiskIds: Array.from(it.relatedRiskIds), priority: it.weight >= 27 ? 'Haute' : it.weight >= 12 ? 'Moyenne' : 'Basse' })) as any;
    return { items: arr };
  }
}
export default RiskEngineV3;