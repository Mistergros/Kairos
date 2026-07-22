import fs from "fs";
import path from "path";
import type { Risk, Action, Obligation, UnityContext, RiskEvaluation, ActionPlan, ActionPlanItem } from "../models";

// Les 28 fichiers config/risks/*.json ne portent pas de gravité/fréquence/
// maîtrise par défaut (contrairement au catalogue duerp_pro_spec/seed). Ces
// valeurs de base par catégorie sont des estimations raisonnables — pas
// encore sourcées individuellement — sur la même échelle (G×F/max(M,0.5))
// que le reste de l'app (src/services/prefillService.ts, seuils dans
// src/utils/score.ts : P1>=80, P2>=50, P3>=25, P4<25). À affiner par risque
// une fois le travail de sourcing (phase 2) fait.
const CATEGORY_DEFAULTS: Record<string, { gravity: number; frequency: number; control: number }> = {
  "Accident majeur": { gravity: 9, frequency: 4, control: 1 },
  "Sécurité": { gravity: 7, frequency: 5, control: 2 },
  "Accident": { gravity: 7, frequency: 5, control: 2 },
  "Accidentel": { gravity: 7, frequency: 5, control: 2 },
  "Biologique": { gravity: 6, frequency: 4, control: 2 },
  "Chimique": { gravity: 7, frequency: 5, control: 1.5 },
  "Physique": { gravity: 4, frequency: 6, control: 2 },
  "Organisationnel": { gravity: 6, frequency: 5, control: 1 },
  "Ergonomique": { gravity: 5, frequency: 7, control: 1 },
  "Environnemental": { gravity: 4, frequency: 4, control: 2 },
};
// Repli générique : mêmes valeurs que le fallback déjà utilisé côté front
// (voir prefillService.ts : gravity ?? 7, frequency ?? 6, control ?? 2).
const DEFAULT_WEIGHTS = { gravity: 7, frequency: 6, control: 2 };

export class RiskEngineV4 {
  private baseConfigPath: string;
  private risks: Map<string,Risk> = new Map();
  private actionsByRisk: Map<string,Action[]> = new Map();
  private generalOblig: Obligation[] = [];
  private sectorOblig: Obligation[] = [];
  private unitsModifiers: Record<string, Record<string,number>> = {};
  private rules: any = null;

  constructor(baseConfigPath?: string){
    this.baseConfigPath = baseConfigPath || path.join(process.cwd(),'config');
    this.loadAll();
  }
  private parseJSON<T>(raw: string): T {
    const clean = (raw || "").replace(/^\uFEFF/, '').replace(/^\u00EF\u00BB\u00BF/, '');
    return JSON.parse(clean) as T;
  }
  private loadJSON<T>(rel: string): T {
    const p = path.join(this.baseConfigPath, rel);
    const raw = fs.readFileSync(p,'utf-8');
    return this.parseJSON<T>(raw);
  }
  private tryRead(p: string){ return fs.existsSync(p) ? fs.readFileSync(p,'utf-8') : null; }
  private loadAll(){
    const rdir = path.join(this.baseConfigPath,'risks');
    fs.readdirSync(rdir).filter(f=>f.endsWith('.json')).forEach(f=>{
      const r = this.parseJSON<Risk>(fs.readFileSync(path.join(rdir,f),'utf-8')); this.risks.set(r.id,r);
    });
    const adir = path.join(this.baseConfigPath,'actions');
    fs.readdirSync(adir).filter(f=>f.endsWith('.json')).forEach(f=>{
      const arr = this.parseJSON<Action[]>(fs.readFileSync(path.join(adir,f),'utf-8'));
      if (arr.length){
        const rid = arr[0].risk_id || (arr[0] as any).related_risk_ids?.[0];
        if (rid) this.actionsByRisk.set(rid, arr);
      }
    });
    this.generalOblig = this.loadJSON<Obligation[]>('obligations/general.json');
    this.sectorOblig = this.loadJSON<Obligation[]>('obligations/sector.json');
    this.unitsModifiers = this.loadJSON<Record<string,Record<string,number>>>('units/modifiers.json');
    const rjson = this.tryRead(path.join(this.baseConfigPath,'rules/conditional.json'));
    this.rules = rjson ? this.parseJSON(rjson) : null;
  }
  private listNaf(): any[] {
    const ndir = path.join(this.baseConfigPath,'naf');
    return fs.readdirSync(ndir).filter(f=>f.endsWith('.json')).map(f => this.parseJSON(fs.readFileSync(path.join(ndir,f),'utf-8')));
  }
  private normCode(s?: string){ return String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,""); }
  public getNAFProfile(nafCode?: string){
    // Les codes NAF réels arrivent avec un point (format INSEE/Sirene, ex.
    // "43.29A" — voir api/companies/search.js et le placeholder d'Inventory.tsx),
    // mais certains profils config/naf/*.json sont enregistrés sans point
    // (ex. "4329A"). On compare toujours des codes normalisés (majuscules,
    // ponctuation retirée) pour que le matching ne dépende pas du formatage.
    const code = this.normCode(nafCode);
    const all = this.listNaf();
    const matches = all.filter(n => code.startsWith(this.normCode(n.code)));
    if (!matches.length) return null;
    // Plusieurs profils peuvent matcher par préfixe (ex. "41" générique et
    // "4120A" spécifique pour un code "4120A") — le plus spécifique (code le
    // plus long) doit toujours l'emporter, indépendamment de l'ordre de
    // lecture des fichiers sur le disque.
    return matches.reduce((best, cur) => (this.normCode(cur.code).length > this.normCode(best.code).length ? cur : best));
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
    const base = CATEGORY_DEFAULTS[risk.category] || DEFAULT_WEIGHTS;
    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

    // Même modèle que le reste de l'app : G x F / max(M, 0.5). Un modificateur
    // positif (contexte plus exposé) augmente gravité/fréquence ; un
    // modificateur négatif (mesures déjà en place) réduit la maîtrise.
    const sev = clamp(base.gravity + mod, 1, 10);
    const freq = clamp(base.frequency + mod, 1, 10);
    const ctl = clamp(base.control - (mod < 0 ? -mod : 0), 0.5, 10);
    const score = (sev * freq) / Math.max(ctl, 0.5);
    return { risk, severity: sev, probability: freq, frequency: freq, control: ctl, score };
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
    })) as ActionPlanItem[];
    return { items: arr };
  }
}
export default RiskEngineV4;
