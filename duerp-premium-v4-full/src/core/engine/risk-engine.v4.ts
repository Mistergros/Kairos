import fs from 'fs'; import path from 'path';
import type { Risk, Action, Obligation, UnityContext, RiskEvaluation, ActionPlan } from '../models';

type ScoringCfg = { model: string; severity_scale: number[]; probability_scale: number[]; frequency_scale: number[]; control_scale: number[]; formula: string; };

export class RiskEngineV4 {
  private baseConfigPath: string;
  private scoring: ScoringCfg;
  private risks: Map<string,Risk> = new Map();
  private actionsByRisk: Map<string,Action[]> = new Map();
  private generalOblig: Obligation[] = [];
  private sectorOblig: Obligation[] = [];
  private unitsModifiers: Record<string, Record<string,number>> = {};
  private rules: any = null;

  constructor(baseConfigPath?: string){
    this.baseConfigPath = baseConfigPath || path.join(process.cwd(),'config');
    this.scoring = this.loadJSON<ScoringCfg>('scoring.json');
    this.loadAll();
  }
  private loadJSON<T>(rel: string): T {
    const p = path.join(this.baseConfigPath, rel);
    return JSON.parse(fs.readFileSync(p,'utf-8')) as T;
  }
  private tryRead(p: string){ return fs.existsSync(p) ? fs.readFileSync(p,'utf-8') : null; }
  private loadAll(){
    const rdir = path.join(this.baseConfigPath,'risks');
    fs.readdirSync(rdir).filter(f=>f.endsWith('.json')).forEach(f=>{
      const r = JSON.parse(fs.readFileSync(path.join(rdir,f),'utf-8')) as Risk; this.risks.set(r.id,r);
    });
    const adir = path.join(this.baseConfigPath,'actions');
    fs.readdirSync(adir).filter(f=>f.endsWith('.json')).forEach(f=>{
      const arr = JSON.parse(fs.readFileSync(path.join(adir,f),'utf-8')) as Action[];
      if (arr.length) this.actionsByRisk.set(arr[0].risk_id, arr);
    });
    this.generalOblig = this.loadJSON<Obligation[]>('obligations/general.json');
    this.sectorOblig = this.loadJSON<Obligation[]>('obligations/sector.json');
    this.unitsModifiers = this.loadJSON<Record<string,Record<string,number>>>('units/modifiers.json');
    const rjson = this.tryRead(path.join(this.baseConfigPath,'rules/conditional.json'));
    this.rules = rjson ? JSON.parse(rjson) : null;
  }
  private listNaf(): any[] {
    const ndir = path.join(this.baseConfigPath,'naf');
    return fs.readdirSync(ndir).filter(f=>f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(ndir,f),'utf-8')));
  }
  public getNAFProfile(nafCode: string){
    const all = this.listNaf();
    return all.find(n => String(nafCode).startsWith(String(n.naf))) || null;
  }
  private applyRules(ctx: UnityContext, riskIds: Set<string>, actionIds: Set<string>, obligIds: Set<string>){
    if (!this.rules) return;
    for (const rule of this.rules.rules){
      let ok = true;
      for (const key in rule.if){
        const parts = key.split('.'); let cur:any = ctx;
        for (const p of parts){ cur = cur?.[p]; }
        if (cur !== (rule.if as any)[key]){ ok = false; break; }
      }
      if (ok){
        (rule.add_risks||[]).forEach((r:string)=>riskIds.add(r));
        (rule.add_actions||[]).forEach((a:string)=>actionIds.add(a));
        (rule.add_obligations||[]).forEach((o:string)=>obligIds.add(o));
      }
    }
  }
  public getRisksFor(nafCode: string, unity: string, ctx?: UnityContext): Risk[] {
    const profile = this.getNAFProfile(nafCode);
    const set = new Set<string>();
    (profile?.risks_mandatory||[]).forEach((r:string)=>set.add(r));
    (profile?.risks_priority||[]).forEach((r:string)=>set.add(r));
    this.applyRules(ctx||{unity,nafCode}, set, new Set<string>(), new Set<string>());
    if (set.size===0){ ['R-ECRAN','R-RPS','R-INCENDIE'].forEach(r=>set.add(r)); }
    return Array.from(set).map(id=>this.risks.get(id)).filter(Boolean) as Risk[];
  }
  public evaluateRisk(risk: Risk, ctx: UnityContext): RiskEvaluation {
    const u = this.unitsModifiers[ctx.unity] || {};
    const mod = (ctx.modifiers?.[risk.id] ?? 0) + (u[risk.id] ?? 0);
    const clamp = (v:number,arr:number[]) => Math.min(Math.max(v,arr[0]),arr[arr.length-1]);
    const sev = clamp(3 + mod, this.scoring.severity_scale);
    const pro = clamp(3 + mod, this.scoring.probability_scale);
    const freq = clamp(2 + mod, this.scoring.frequency_scale);
    const ctl = clamp(2 + (mod<0?-mod:0), this.scoring.control_scale);
    const score = sev * pro * freq * ctl;
    return { risk, severity: sev, probability: pro, frequency: freq, control: ctl, score };
  }
  public matchActions(risk: Risk, nafCode: string, ctx?: UnityContext): Action[] {
    return this.actionsByRisk.get(risk.id) || [];
  }
  public matchObligations(nafCode: string, ctx?: UnityContext): Obligation[] {
    const out: Obligation[] = [...this.generalOblig];
    const oset = new Set<string>(out.map(x=>x.id));
    for (const o of this.sectorOblig){
      if (o.applies_to_all) { if(!oset.has(o.id)){ out.push(o); oset.add(o.id);} continue; }
      if (o.naf_specific?.some(prefix=> String(nafCode).startsWith(prefix))) { if(!oset.has(o.id)){ out.push(o); oset.add(o.id);} }
    }
    if (this.rules && ctx){
      const tmpR = new Set<string>(), tmpA = new Set<string>(), tmpO = new Set<string>();
      this.applyRules(ctx, tmpR, tmpA, tmpO);
      for (const id of tmpO){ if(!oset.has(id)) out.push({ id, title:id, reference:'' } as any); }
    }
    return out;
  }
  public generateActionPlan(evals: RiskEvaluation[], nafCode: string, ctx?: UnityContext): ActionPlan {
    const items = new Map<string,{a:Action; weight:number; risks:Set<string>}>();
    for (const e of evals){
      const actions = this.matchActions(e.risk, nafCode, ctx);
      for (const a of actions){
        if (!items.has(a.id)) items.set(a.id,{a,weight:0,risks:new Set<string>()});
        const it = items.get(a.id)!; it.weight += e.score; it.risks.add(e.risk.id);
      }
    }
    const arr = Array.from(items.values()).sort((x,y)=>y.weight - x.weight).map(it=> ({
      action: it.a, relatedRiskIds: Array.from(it.risks),
      priority: it.weight >= 200 ? 'Haute' : it.weight >= 100 ? 'Moyenne' : 'Basse'
    }));
    return { items: arr };
  }
}
export default RiskEngineV4;