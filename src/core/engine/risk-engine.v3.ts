import baseRisks from "../../config/risks.catalog.json";
import actionsCatalog from "../../config/actions.catalog.json";
import obligationsCatalog from "../../config/obligations.catalog.json";
import scoring from "../../config/scoring.json";
import naf47 from "../../config/naf/47-commerce.json";
import naf56 from "../../config/naf/56-restauration.json";
import naf86 from "../../config/naf/86-sante.json";
import naf88 from "../../config/naf/88-action-sociale.json";
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
  | "machines";

export type FeatureFlags = Partial<Record<FeatureFlagKey, boolean>>;

export interface RiskEngineV3Input {
  nafCode?: string;
  unity?: string;
  features?: FeatureFlags;
  units?: Unity[];
}

interface ScoringConfig {
  priorityThresholds: { critical: number; high: number; medium: number };
}

const scoringConfig = scoring as ScoringConfig;

const nafRegistry: Record<string, any> = {
  "47": naf47,
  "56": naf56,
  "86": naf86,
  "88": naf88,
};

const featureRisks: Record<FeatureFlagKey, Risk> = {
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

const featureActions: Record<FeatureFlagKey, Action[]> = {
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

const featureObligations: Record<FeatureFlagKey, Obligation[]> = {
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
      description: "Mesures de prevention des incivilites et soutien aux equipes exposées",
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

export class RiskEngineV3 {
  getRisks(input: RiskEngineV3Input): Risk[] {
    const nafKey = (input.nafCode || "").slice(0, 2);
    const nafProfile = nafRegistry[nafKey];
    const nafRisks: Risk[] = Array.isArray(nafProfile?.risks) ? (nafProfile.risks as Risk[]) : [];
    const base = Array.isArray(baseRisks) ? (baseRisks as Risk[]) : [];

    const enabledFeatures = Object.entries(input.features || {})
      .filter(([, enabled]) => enabled)
      .map(([key]) => key as FeatureFlagKey);

    const featureBasedRisks = enabledFeatures.map((key) => featureRisks[key]).filter(Boolean);

    const merged = dedupe([...base, ...nafRisks, ...featureBasedRisks]).filter(
      (risk) => nafMatch(risk.naf_specific, input.nafCode) && matchesUnity(risk, input.unity)
    );

    if (!nafProfile?.risks_priority) return merged;
    const priorityIndex = new Map<string, number>();
    nafProfile.risks_priority.forEach((id: string, idx: number) => priorityIndex.set(id, idx));
    return merged.sort((a, b) => {
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
      const severity = this.severityFor(risk, input.features);
      const probability = this.probabilityFor(risk, input.features);
      const control = 1;
      const score = Math.round(severity * probability * control);
      const priority = priorityFromScore(score);
      return {
        risk,
        unity: unit,
        severity,
        probability,
        control,
        score,
        priority,
        matchedActions: this.matchActions(risk, input),
        obligations: this.matchObligations(risk, input.nafCode, input.features),
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
    const baseObligations = Array.isArray(obligationsCatalog) ? (obligationsCatalog as Obligation[]) : [];
    const enabledFeatures = Object.entries(input.features || {})
      .filter(([, enabled]) => enabled)
      .map(([key]) => key as FeatureFlagKey);

    const featureObs = enabledFeatures.flatMap((key) => featureObligations[key] || []);

    return dedupe(
      baseObligations.filter((o) => nafMatch(o.naf_specific, input.nafCode)).filter((o) => !o.risk_ids?.length || risks.some((r) => o.risk_ids?.includes(r.id))).concat(featureObs)
    );
  }

  private matchActions(risk: Risk, input: RiskEngineV3Input): Action[] {
    const catalogActions: Action[] = Array.isArray(actionsCatalog) ? (actionsCatalog as Action[]) : [];
    const matchedFromCatalog = catalogActions.filter(
      (action) => action.risk_id === risk.id && nafMatch(action.naf_specific, input.nafCode)
    );

    const featureMatches = Object.entries(input.features || {})
      .filter(([, enabled]) => enabled)
      .map(([key]) => key as FeatureFlagKey)
      .flatMap((key) => featureActions[key] || [])
      .filter((action) => action.risk_id === risk.id);

    return dedupe([...matchedFromCatalog, ...featureMatches]);
  }

  private matchObligations(risk: Risk, nafCode?: string, features?: FeatureFlags): Obligation[] {
    const baseObligations = Array.isArray(obligationsCatalog) ? (obligationsCatalog as Obligation[]) : [];
    const enabledFeatures = Object.entries(features || {})
      .filter(([, enabled]) => enabled)
      .map(([key]) => key as FeatureFlagKey);
    const featureObs = enabledFeatures.flatMap((key) => featureObligations[key] || []);

    return dedupe(
      baseObligations
        .filter((o) => nafMatch(o.naf_specific, nafCode))
        .filter((o) => !o.risk_ids?.length || o.risk_ids.includes(risk.id))
        .concat(featureObs.filter((o) => !o.risk_ids?.length || o.risk_ids.includes(risk.id)))
    );
  }

  private severityFor(risk: Risk, features?: FeatureFlags): number {
    if (risk.id.startsWith("R-INCENDIE") || risk.id.startsWith("R-MACHINE")) return 9;
    if (risk.id.startsWith("R-SOLVENTS") || risk.id.startsWith("R-BIO")) return 8;
    if (features?.outdoor_uv && risk.id === "R-UV") return 7;
    return 6;
  }

  private probabilityFor(risk: Risk, features?: FeatureFlags): number {
    if (features?.night_work && risk.id === "R-NIGHT") return 8;
    if (features?.cold_room && risk.id === "R-COLD") return 7;
    if (features?.public_facing && risk.id === "R-PUBLIC") return 7;
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
