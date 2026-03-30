import baseRisks from "../../config/risks.catalog.json";
import actionsCatalog from "../../config/actions.catalog.json";
import obligationsCatalog from "../../config/obligations.catalog.json";
import scoring from "../../config/scoring.json";
import activityScoring from "../../config/scoring.activity.json";
import activityRules from "../../config/rules/activity.rules.json";
import unitModifiers from "../../config/units/modifiers.ext.json";
import naf47 from "../../config/naf/47-commerce.json";
import naf56 from "../../config/naf/56-restauration.json";
import naf86 from "../../config/naf/86-sante.json";
import naf88 from "../../config/naf/88-action-sociale.json";
import generatedBundle from "../../config_generated/bundle.json";
import type { Action, ActionPlan } from "../models/action";
import type { Obligation } from "../models/legal";
import type { Risk } from "../models/risk";
import type { RiskEvaluation, RiskPriority } from "../models/duerp";
import type { Unity } from "../models/unity";

export type FeatureFlagKey =
  | "solvents"
  | "cold_room"
  | "night_work"
  | "public_facing"
  | "vibrating_tools"
  | "outdoor_uv"
  | "machines"
  | "manual_handling"
  | "heights"
  | "noise"
  | "screen_work"
  | "driving"
  | "bio"
  | "cleaning_agents";

export type FeatureFlags = Partial<Record<FeatureFlagKey | string, boolean>>;

export interface RiskEngineV3Input {
  nafCode?: string;
  unity?: string;
  activity?: string;
  features?: FeatureFlags;
  tags?: string[];
  measurements?: Record<string, number>;
  units?: Unity[];
}

interface ScoringConfig {
  priorityThresholds: { critical: number; high: number; medium: number };
}

const scoringConfig = scoring as ScoringConfig;

type GeneratedBundle = {
  risks?: Risk[];
  actions?: any[];
  obligations?: any[];
  naf?: any[];
  unitsModifiers?: Record<string, any>;
};

const generated = generatedBundle as unknown as GeneratedBundle;
const hasGenerated = Boolean(generated?.risks?.length);

function buildNafRegistryFromBundle(nafList?: any[]): Record<string, any> | undefined {
  if (!nafList?.length) return undefined;
  const registry: Record<string, any> = {};
  nafList.forEach((entry) => {
    const code: string = String((entry as any).naf || (entry as any).code || "").slice(0, 2);
    if (!code) return;
    registry[code] = entry;
  });
  return registry;
}

const nafRegistryGenerated = buildNafRegistryFromBundle(generated?.naf);

const nafRegistry: Record<string, any> = nafRegistryGenerated ?? {
  "47": naf47,
  "56": naf56,
  "86": naf86,
  "88": naf88,
};

const featureRisks: Partial<Record<FeatureFlagKey, Risk>> = {
  solvents: {
    id: "R-SOLVENTS",
    name: "Solvants et COV",
    category: "Chimique",
    description: "Utilisation de solvants, degraissants ou peintures volatiles",
    units: ["Atelier", "Cuisine", "Magasin"],
  },
  cold_room: {
    id: "R-COLD",
    name: "Chambre froide",
    category: "Ambiances physiques",
    description: "Travail en froid positif/negatif avec condensation et glissades",
    units: ["Cuisine", "Reserve"],
  },
  night_work: {
    id: "R-NIGHT",
    name: "Travail de nuit",
    category: "Organisationnel",
    description: "Horaires de nuit et travail isole",
    units: ["Magasin", "Accueil"],
  },
  public_facing: {
    id: "R-PUBLIC",
    name: "Relation public et incivilites",
    category: "Organisationnel",
    description: "Contact clientele, tensions et incivilites",
    units: ["Accueil", "Magasin"],
  },
  vibrating_tools: {
    id: "R-VIBRATION",
    name: "Outils vibrants",
    category: "Physique",
    description: "Exposition aux vibrations main-bras",
    units: ["Atelier", "Maintenance"],
  },
  outdoor_uv: {
    id: "R-UV",
    name: "Exposition UV",
    category: "Environnement",
    description: "Travail exterieur avec exposition solaire",
    units: ["Terrain", "Livraison"],
  },
  machines: {
    id: "R-MACHINE",
    name: "Machines et protections",
    category: "Securite",
    description: "Machines avec pieces en mouvement et protections a verifier",
    units: ["Atelier", "Production"],
  },
};

const featureActions: Partial<Record<FeatureFlagKey, Action[]>> = {
  solvents: [
    {
      id: "A-SOLVENTS-SUBST",
      risk_id: "R-SOLVENTS",
      title: "Substitution des solvants et ventilation",
      type: "Technique",
      difficulty: "Moyenne",
      cost: "Moyen",
      impact: "Reduire l'exposition aux COV par substitution et captage",
    },
  ],
  cold_room: [
    {
      id: "A-COLD-PPE",
      risk_id: "R-COLD",
      title: "EPI thermiques + anti-glisse",
      type: "Technique",
      difficulty: "Faible",
      cost: "Faible",
      impact: "Limiter le froid et les chutes en chambre froide",
    },
  ],
  night_work: [
    {
      id: "A-NIGHT-ORGA",
      risk_id: "R-NIGHT",
      title: "Organisation travail de nuit",
      type: "Organisation",
      difficulty: "Moyenne",
      cost: "Moyen",
      impact: "Planification, repos, binome ou supervision a distance",
    },
  ],
  public_facing: [
    {
      id: "A-PUBLIC-FORM",
      risk_id: "R-PUBLIC",
      title: "Formation gestion des incivilites",
      type: "Formation",
      difficulty: "Faible",
      cost: "Moyen",
      impact: "Ameliorer la gestion des situations tendues avec le public",
    },
  ],
  vibrating_tools: [
    {
      id: "A-VIBRATION-CONTROL",
      risk_id: "R-VIBRATION",
      title: "Controle des expositions vibration",
      type: "Technique",
      difficulty: "Moyenne",
      cost: "Moyen",
      impact: "Suivi expositions, remplacement outils et gants anti-vibrations",
    },
  ],
  outdoor_uv: [
    {
      id: "A-UV-PROTECT",
      risk_id: "R-UV",
      title: "Protection UV et organisation",
      type: "Technique",
      difficulty: "Faible",
      cost: "Faible",
      impact: "Ombriere, pauses, creme solaire, horaires decales",
    },
  ],
  machines: [
    {
      id: "A-MACHINE-GUARD",
      risk_id: "R-MACHINE",
      title: "Verification des protecteurs et consignation",
      type: "Technique",
      difficulty: "Moyenne",
      cost: "Moyen",
      impact: "Limiter les contacts avec pieces en mouvement",
    },
  ],
};

const featureObligations: Partial<Record<FeatureFlagKey, Obligation[]>> = {
  solvents: [
    {
      id: "OB-SOLVENTS-DOSSIER",
      title: "FDS et evaluation COV",
      description: "Tenir a jour les fiches de donnees de securite et evaluer l'exposition COV",
      risk_ids: ["R-SOLVENTS"],
    },
  ],
  cold_room: [
    {
      id: "OB-COLD-MAINT",
      title: "Maintenance chambres froides",
      description: "Verifications periodiques des installations frigorifiques",
      risk_ids: ["R-COLD"],
    },
  ],
  night_work: [
    {
      id: "OB-NIGHT-MEDICAL",
      title: "Suivi medical travail de nuit",
      description: "Organisation du suivi medical renforce pour le travail de nuit",
      risk_ids: ["R-NIGHT"],
    },
  ],
  public_facing: [
    {
      id: "OB-PUBLIC-RPS",
      title: "Prevention RPS et incivilites",
      description: "Mesures de prevention des incivilites et soutien aux equipes exposees",
      risk_ids: ["R-PUBLIC"],
    },
  ],
  vibrating_tools: [
    {
      id: "OB-VIBRATION-MESURE",
      title: "Mesure exposition vibrations",
      description: "Mesurer et tracer les expositions aux vibrations main-bras",
      risk_ids: ["R-VIBRATION"],
    },
  ],
  outdoor_uv: [
    {
      id: "OB-UV-PREVENTION",
      title: "Plan d'exposition UV",
      description: "Informer et equiper les travailleurs exposes au rayonnement solaire",
      risk_ids: ["R-UV"],
    },
  ],
  machines: [
    {
      id: "OB-MACHINE-CONSIGNATION",
      title: "Consignation / deconsignation",
      description: "Mettre en place et documenter les procedures de consignation",
      risk_ids: ["R-MACHINE"],
    },
  ],
};

type ScoreTriplet = { severity?: number; probability?: number; control?: number };
interface ActivityScoringConfig {
  default: Required<ScoreTriplet>;
  activities?: Record<string, Record<string, ScoreTriplet>>;
}

type RuleEffect = {
  add_risks?: string[];
  add_obligations?: string[];
  add_actions?: string[];
};

type RuleCondition = {
  naf_prefix?: string[];
  activities?: string[];
  features?: string[];
  tags?: string[];
  measurements?: Record<string, string>;
};

type ActivityRule = {
  id: string;
  if: RuleCondition;
  then: RuleEffect;
};

const activityConfig = activityScoring as ActivityScoringConfig;
const rulesConfig = activityRules as ActivityRule[];
const risksSource: Risk[] = hasGenerated && Array.isArray(generated?.risks) ? (generated?.risks as Risk[]) : (baseRisks as Risk[]);
const actionsSource: any[] =
  hasGenerated && Array.isArray(generated?.actions) ? (generated?.actions as any[]) : (actionsCatalog as any[]);
const obligationsSource: any[] =
  hasGenerated && Array.isArray(generated?.obligations)
    ? (generated?.obligations as any[])
    : (obligationsCatalog as unknown as any[]);
const modifiersConfig = hasGenerated && generated?.unitsModifiers ? generated.unitsModifiers : (unitModifiers as any);

function dedupe<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  items.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

function priorityFromScore(score: number): RiskPriority {
  if (score >= scoringConfig.priorityThresholds.critical) return "critical";
  if (score >= scoringConfig.priorityThresholds.high) return "high";
  if (score >= scoringConfig.priorityThresholds.medium) return "medium";
  return "low";
}

function letterFromPriority(priority: RiskPriority): "H" | "M" | "B" {
  if (priority === "critical" || priority === "high") return "H";
  if (priority === "medium") return "M";
  return "B";
}

function nafMatch(list: string[] | undefined, nafCode?: string) {
  if (!nafCode || !list || list.length === 0) return true;
  return list.some((code) => nafCode.startsWith(code));
}

function matchesUnity(risk: Risk, unity?: string) {
  if (!unity || !risk.units || risk.units.length === 0) return true;
  if (risk.units.includes("Tous")) return true;
  return risk.units.some((unit) => unit.toLowerCase() === unity.toLowerCase());
}

function matchesMeasurements(ruleMeasurements: Record<string, string> | undefined, measurements?: Record<string, number>) {
  if (!ruleMeasurements || Object.keys(ruleMeasurements).length === 0) return true;
  if (!measurements) return false;
  const parseCond = (expr: string) => {
    const m = expr.trim().match(/^(>=|<=|>|<)?\s*([0-9]+(\.[0-9]+)?)$/);
    if (!m) return null;
    return { op: m[1] || ">=", value: Number(m[2]) };
  };
  return Object.entries(ruleMeasurements).every(([key, expr]) => {
    const cond = parseCond(expr);
    if (!cond) return false;
    const val = measurements[key];
    if (val === undefined || val === null) return false;
    switch (cond.op) {
      case ">": return val > cond.value;
      case ">=": return val >= cond.value;
      case "<": return val < cond.value;
      case "<=": return val <= cond.value;
      default: return false;
    }
  });
}

function extractRuleEffects(input: RiskEngineV3Input) {
  const matchedRules = (rulesConfig || []).filter((rule) => {
    const cond = rule.if || {};
    const allowedKeys = ["naf_prefix", "activities", "features", "tags", "measurements"];
    const hasUnsupported = Object.keys(cond).some((k) => !allowedKeys.includes(k));
    if (hasUnsupported) return false;
    const nafOk = cond.naf_prefix ? cond.naf_prefix.some((p) => (input.nafCode || "").startsWith(p)) : true;
    const actOk =
      cond.activities && cond.activities.length
        ? cond.activities.some((a) => a.toLowerCase() === (input.activity || "").toLowerCase())
        : true;
    const featOk =
      cond.features && cond.features.length ? cond.features.some((f) => (input.features as any)?.[f]) : true;
    const tagOk =
      cond.tags && cond.tags.length
        ? cond.tags.some((t) => (input.tags || []).map((x) => x.toLowerCase()).includes(t.toLowerCase()))
        : true;
    const measOk = matchesMeasurements(cond.measurements, input.measurements);
    return nafOk && actOk && featOk && tagOk && measOk;
  });

  const addRisks = matchedRules.flatMap((r) => r.then?.add_risks || []);
  const addObligations = matchedRules.flatMap((r) => r.then?.add_obligations || []);
  const addActions = matchedRules.flatMap((r) => r.then?.add_actions || []);
  return { addRisks, addObligations, addActions };
}

export class RiskEngineV3 {
  getRisks(input: RiskEngineV3Input): Risk[] {
    const nafKey = (input.nafCode || "").slice(0, 2);
    const nafProfile = nafRegistry[nafKey];
    const nafRisks: Risk[] = Array.isArray(nafProfile?.risks) ? (nafProfile.risks as Risk[]) : [];
    const base = risksSource;

    const enabledFeatures = Object.entries(input.features || {})
      .filter(([, enabled]) => enabled)
      .map(([key]) => key as FeatureFlagKey);

    const featureBasedRisks = enabledFeatures
      .map((key) => featureRisks[key as FeatureFlagKey])
      .filter((risk): risk is Risk => Boolean(risk));

    const merged = dedupe([...base, ...nafRisks, ...featureBasedRisks]).filter(
      (risk) => nafMatch(risk.naf_specific, input.nafCode) && matchesUnity(risk, input.unity)
    );

    const { addRisks } = extractRuleEffects(input);
    const mergedWithRules = dedupe(
      [...merged, ...addRisks.map((id) => base.find((r) => r.id === id) || nafRisks.find((r) => r.id === id))].filter(
        Boolean
      ) as Risk[]
    );

    if (!nafProfile?.risks_priority) return mergedWithRules;
    const priorityIndex = new Map<string, number>();
    nafProfile.risks_priority.forEach((id: string, idx: number) => priorityIndex.set(id, idx));
    return mergedWithRules.sort((a, b) => {
      const pa = priorityIndex.get(a.id);
      const pb = priorityIndex.get(b.id);
      if (pa !== undefined && pb !== undefined && pa !== pb) return pa - pb;
      if (pa !== undefined) return -1;
      if (pb !== undefined) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  evaluate(input: RiskEngineV3Input): RiskEvaluation[] {
    const risks = this.getRisks(input);
    const unit: Unity = { id: input.unity || "default", name: input.unity || "Unite" };
    const evaluations = risks.map((risk) => {
      const baseScore = this.baseScoreFor(risk, input);
      const boosted = this.applyFeatureBoosts(risk, baseScore, input.features);
      const score = Math.round(boosted.severity * boosted.probability * boosted.control);
      const priority = priorityFromScore(score);
      return {
        risk,
        unity: unit,
        severity: boosted.severity,
        probability: boosted.probability,
        control: boosted.control,
        score,
        priority,
        matchedActions: this.matchActions(risk, input),
        obligations: this.matchObligations(risk, input),
      };
    });
    return evaluations;
  }

  plan(evaluations: RiskEvaluation[], nafCode?: string): ActionPlan {
    const itemsMap = new Map<string, { action: Action; priorityScore: number; relatedRiskIds: string[]; nafAligned: boolean }>();
    evaluations.forEach((evaluation) => {
      const actions = evaluation.matchedActions || [];
      actions.forEach((action) => {
        const priorityScore = evaluation.score;
        const existing = itemsMap.get(action.id);
        if (existing) {
          existing.priorityScore = Math.max(existing.priorityScore, priorityScore);
          if (!existing.relatedRiskIds.includes(evaluation.risk.id)) existing.relatedRiskIds.push(evaluation.risk.id);
          return;
        }
        itemsMap.set(action.id, {
          action,
          priorityScore,
          relatedRiskIds: [evaluation.risk.id],
          nafAligned: nafMatch(action.naf_specific, nafCode),
        });
      });
    });

    const items = Array.from(itemsMap.values()).sort((a, b) => b.priorityScore - a.priorityScore);
    return {
      generatedAt: new Date().toISOString(),
      items,
    };
  }

  obligations(input: RiskEngineV3Input): Obligation[] {
    const risks = this.getRisks(input);
    const baseObligations = Array.isArray(obligationsSource) ? (obligationsSource as unknown as Obligation[]) : [];
    const { addObligations } = extractRuleEffects(input);
    const enabledFeatures = Object.entries(input.features || {})
      .filter(([, enabled]) => enabled)
      .map(([key]) => key as FeatureFlagKey);

    const featureObs = enabledFeatures.flatMap((key) => featureObligations[key] || []);
    const ruleObs = baseObligations.filter((o) => addObligations.includes(o.id));

    const combined = dedupe(
      baseObligations
        .filter((o) => nafMatch(o.naf_specific, input.nafCode))
        .filter((o) => !o.risk_ids?.length || risks.some((r) => o.risk_ids?.includes(r.id)))
        .concat(featureObs)
        .concat(ruleObs)
    ) as unknown as Obligation[];

    return combined.map(normalizeObligation);
  }

  private matchActions(risk: Risk, input: RiskEngineV3Input): Action[] {
    const catalogActionsRaw = Array.isArray(actionsSource) ? (actionsSource as any[]) : [];
    const catalogActions: Action[] = catalogActionsRaw.map((a) => ({
      ...a,
      risk_id: a.risk_id || (a.related_risk_ids && a.related_risk_ids[0]) || "",
    }));
    const matchedFromCatalog = catalogActions.filter((action) =>
      (action.risk_id === risk.id ||
        (action.related_risk_ids && action.related_risk_ids.includes(risk.id))) &&
      nafMatch(action.naf_specific, input.nafCode)
    );

    const featureMatches = Object.entries(input.features || {})
      .filter(([, enabled]) => enabled)
      .map(([key]) => key as FeatureFlagKey)
      .flatMap((key) => featureActions[key] || [])
      .filter(
        (action) =>
          action.risk_id === risk.id ||
          (action.related_risk_ids && (action.related_risk_ids as string[]).includes(risk.id))
      );

    const { addActions } = extractRuleEffects(input);
    const ruleMatches = catalogActions.filter(
      (a) =>
        addActions.includes(a.id) &&
        (a.risk_id === risk.id || (a.related_risk_ids && a.related_risk_ids.includes(risk.id)))
    );

    return dedupe([...matchedFromCatalog, ...featureMatches, ...ruleMatches]);
  }

  private matchObligations(risk: Risk, input: RiskEngineV3Input): Obligation[] {
    const baseObligations = Array.isArray(obligationsSource) ? (obligationsSource as unknown as Obligation[]) : [];
    const enabledFeatures = Object.entries(input.features || {})
      .filter(([, enabled]) => enabled)
      .map(([key]) => key as FeatureFlagKey);
    const featureObs = enabledFeatures.flatMap((key) => featureObligations[key] || []);
    const { addObligations } = extractRuleEffects(input);
    const ruleObs = baseObligations.filter((o) => addObligations.includes(o.id) && o.risk_ids?.includes(risk.id));

    const combined = dedupe(
      baseObligations
        .filter((o) => nafMatch(o.naf_specific, input.nafCode))
        .filter((o) => !o.risk_ids?.length || o.risk_ids.includes(risk.id))
        .concat(featureObs.filter((o) => !o.risk_ids?.length || o.risk_ids.includes(risk.id)))
        .concat(ruleObs)
    ) as unknown as Obligation[];

    return combined.map(normalizeObligation);
  }

  private baseScoreFor(risk: Risk, input: RiskEngineV3Input) {
    const defaultBase = activityConfig.default || { severity: 7, probability: 6, control: 2 };
    const activityKey = input.activity || "";
    const activityTable = activityKey && activityConfig.activities ? activityConfig.activities[activityKey] : undefined;
    const activityScore = activityTable?.[risk.id] || activityTable?.default || defaultBase;
    const fallbackSeverity = this.severityFallback(risk, input.features);
    const fallbackProbability = this.probabilityFallback(risk, input.features);
    let severity = Math.max(activityScore.severity ?? defaultBase.severity, fallbackSeverity);
    let probability = Math.max(activityScore.probability ?? defaultBase.probability, fallbackProbability);
    let control = activityScore.control ?? defaultBase.control;

    const actKey = (input.activity || "").toLowerCase();
    const actMod = modifiersConfig?.activities?.[actKey]?.[risk.id];
    const globalMod = modifiersConfig?.default?.[risk.id];
    const applyMod = (mod?: { severity?: number; probability?: number; control?: number }) => {
      if (!mod) return;
      severity += mod.severity ?? 0;
      probability += mod.probability ?? 0;
      control += mod.control ?? 0;
    };
    applyMod(globalMod);
    applyMod(actMod);

    return {
      severity,
      probability,
      control,
    };
  }

  private applyFeatureBoosts(risk: Risk, baseScore: { severity: number; probability: number; control: number }, features?: FeatureFlags) {
    const boosts: Record<string, { severity?: number; probability?: number; control?: number; appliesTo?: string[] }> = {
      solvents: { severity: 2, appliesTo: ["R-SOLVENTS", "R-CHIMIQUE", "R-ATEX"] },
      machines: { severity: 1, probability: 1, appliesTo: ["R-MACHINE", "R-COUPURE", "R-MANUTENTION", "R-INCENDIE"] },
      vibrating_tools: { severity: 1, probability: 1, appliesTo: ["R-VIBRATIONS", "R-TMS"] },
      manual_handling: { severity: 1, probability: 1, appliesTo: ["R-MANUTENTION", "R-TMS"] },
      heights: { severity: 2, appliesTo: ["R-CHUTE-HAUTEUR"] },
      bio: { severity: 2, appliesTo: ["R-BIO"] },
      cold_room: { probability: 1, appliesTo: ["R-FROID"] },
      night_work: { probability: 2, appliesTo: ["R-TRAVAILNUIT", "R-RPS"] },
      public_facing: { probability: 2, appliesTo: ["R-AGRESSION", "R-RPS"] },
      outdoor_uv: { severity: 1, appliesTo: ["R-RAYONNEMENT", "R-UV"] },
      noise: { probability: 1, appliesTo: ["R-BRUIT"] },
      screen_work: { probability: 1, appliesTo: ["R-ECRAN", "R-TMS"] },
      driving: { probability: 1, appliesTo: ["R-ROUTIER"] },
      cleaning_agents: { severity: 1, probability: 1, appliesTo: ["R-CHIMIQUE"] },
    };

    let severity = baseScore.severity;
    let probability = baseScore.probability;
    let control = baseScore.control;
    const enabled = Object.entries(features || {})
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);

    enabled.forEach((key) => {
      const boost = boosts[key];
      if (!boost) return;
      if (boost.appliesTo && !boost.appliesTo.some((id) => risk.id === id)) return;
      severity += boost.severity ?? 0;
      probability += boost.probability ?? 0;
      control += boost.control ?? 0;
    });

    return {
      severity: clamp(severity, 1, 10),
      probability: clamp(probability, 1, 10),
      control: clamp(control, 0.5, 10),
    };
  }

  private severityFallback(risk: Risk, features?: FeatureFlags): number {
    if (risk.id.startsWith("R-INCENDIE") || risk.id.startsWith("R-MACHINE")) return 9;
    if (risk.id.startsWith("R-SOLVENTS") || risk.id.startsWith("R-BIO")) return 8;
    if (features?.outdoor_uv && (risk.id === "R-UV" || risk.id === "R-RAYONNEMENT")) return 7;
    if (risk.id === "R-CHUTE-HAUTEUR") return 8;
    return 6;
  }

  private probabilityFallback(risk: Risk, features?: FeatureFlags): number {
    if (features?.night_work && risk.id === "R-TRAVAILNUIT") return 8;
    if (features?.cold_room && risk.id === "R-FROID") return 7;
    if (features?.public_facing && risk.id === "R-AGRESSION") return 7;
    return 5;
  }
}

export interface ComputeResponse {
  risks: Risk[];
  evaluations: (RiskEvaluation & { priorityLetter: "H" | "M" | "B" })[];
  plan: ActionPlan & { priorityLetter?: "H" | "M" | "B" };
  obligations: Obligation[];
}

export function compute(input: RiskEngineV3Input): ComputeResponse {
  const engine = new RiskEngineV3();
  const risks = engine.getRisks(input);
  const evaluations = engine.evaluate(input).map((evaluation) => ({
    ...evaluation,
    priorityLetter: letterFromPriority(evaluation.priority),
  }));
  const plan = engine.plan(evaluations, input.nafCode);
  const obligations = engine.obligations(input);
  return { risks, evaluations, plan, obligations };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeObligation(o: Obligation): Obligation {
  if (o.description) return o;
  return { ...o, description: "" };
}
