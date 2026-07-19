import { riskLibrary } from "../data/riskLibrary";
import { nafPresets } from "../data/nafPresets";
import { buildHazardsFromMapping } from "../data/nafMappingLoader";
import { hazardByNafPrefix } from "../data/sectorHazards";
import { RiskEngineV3 } from "../core/engine/risk-engine.v3";
import duerpApi from "./duerpApi";
import { computePriority } from "../utils/score";
import { uid } from "../utils/uid";
import { makeActionForAssessment } from "./actionCatalogService";
import { getTemplateHazards } from "./templateService";
import type { Assessment, ActionItem, Hazard, WorkUnit } from "../types";

const USE_REMOTE_ENGINE = import.meta.env.VITE_USE_REMOTE_ENGINE === "true";

type PresetHazard = Hazard & { gravity?: number; frequency?: number; control?: number };

const FEATURE_BOOSTS: Record<string, { gravity?: number; frequency?: number; control?: number }> = {
  solvents: { gravity: 2 },
  cold_room: { frequency: 1 },
  night_work: { gravity: 1 },
  public_facing: { frequency: 1 },
  vibrating_tools: { gravity: 1, frequency: 1 },
  outdoor_uv: { gravity: 1 },
  machines: { gravity: 1, frequency: 1 },
  screen_work: { gravity: 0, frequency: 0 },
  manual_handling: { gravity: 1, frequency: 1 },
  noise: { frequency: 1 },
  driving: { frequency: 1 },
  heights: { gravity: 2 },
  bio: { gravity: 2 },
  cleaning_agents: { gravity: 1, frequency: 1 },
};

const applyFeatureAdjustments = (g: number, f: number, c: number, features?: string[]) => {
  if (!features || !features.length) return { gravity: g, frequency: f, control: c };
  let gravity = g;
  let frequency = f;
  let control = c;
  features.forEach((feat) => {
    const boost = FEATURE_BOOSTS[feat];
    if (!boost) return;
    gravity += boost.gravity ?? 0;
    frequency += boost.frequency ?? 0;
    control += boost.control ?? 0;
  });
  gravity = Math.min(Math.max(gravity, 1), 10);
  frequency = Math.min(Math.max(frequency, 1), 10);
  control = Math.min(Math.max(control, 0.5), 10);
  return { gravity, frequency, control };
};

export type PrefillResult = {
  hazardLibrary: Hazard[];
  assessments: Assessment[];
  actions: ActionItem[];
  usedGenericFallback: boolean;
};

function buildV3Context(unit: WorkUnit | undefined, naf: string | undefined, sector: string | undefined) {
  const featuresFlags = (unit?.features || []).reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {} as Record<string, boolean>);
  return { nafCode: naf || sector, features: featuresFlags, activity: unit?.activity, unity: unit?.name };
}

export async function buildPrefillData(
  naf: string | undefined,
  sector: string | undefined,
  targetUnits: WorkUnit[],
  existingLibrary: Hazard[],
  existingAssessments: Assessment[],
  existingActions: ActionItem[],
  targetEstablishmentId: string | undefined,
): Promise<PrefillResult> {
  const nafPrefix = naf ? naf.toUpperCase().slice(0, 2) : "";
  const engine = new RiskEngineV3();
  const primaryUnit = targetUnits[0];

  // --- 1. Moteur V4 remote ou V3 local ---
  let engineEvaluations: any[] = [];
  if (USE_REMOTE_ENGINE) {
    try {
      const remote = await duerpApi.evaluateV4(buildV3Context(primaryUnit, naf, sector));
      engineEvaluations = Array.isArray(remote?.evaluations) ? remote.evaluations : [];
    } catch (err) {
      console.warn("Remote engine V4 failed, fallback to V3", err);
    }
  }
  if (!engineEvaluations.length) {
    engineEvaluations = engine.evaluate(buildV3Context(primaryUnit, naf, sector));
  }

  const engineHazards = engineEvaluations
    .map((e) => ({
      id: e.risk.id,
      category: e.risk.category || "Risque",
      risk: e.risk.name,
      damages: e.risk.description,
      example_prevention: "",
      sector: naf || sector || "",
      gravity: e.severity,
      frequency: e.probability,
      control: e.control,
      source: e.risk.sources?.[0],
      sourceUrl: e.risk.sourceUrls?.[0],
    }))
    .sort((a, b) => a.risk.localeCompare(b.risk)) as PresetHazard[];

  // --- 2. Templates spécifiques au type d'unité (priorité maximale) ---
  const templateHazards = getTemplateHazards(naf, primaryUnit?.name || "", primaryUnit?.activity);

  const mappingHazards = buildHazardsFromMapping(naf);
  const presetFromJson = nafPresets[nafPrefix]?.hazards || [];
  const fallbackPreset = hazardByNafPrefix[nafPrefix] || [];

  // Pipeline de merge : templates > moteur > mapping > presets > bibliothèque
  const merged: Hazard[] = [];
  const pushAll = (list: Hazard[]) => list.forEach((h) => merged.push(h));

  if (templateHazards.length) pushAll(templateHazards);
  if (engineHazards.length) pushAll(engineHazards);
  // Les couches suivantes ne doivent que compléter, pas noyer, les résultats
  // des couches prioritaires : le mapping NAF (kairos_duerp_naf_mapping.json)
  // peut renvoyer des dizaines d'entrées génériques avec un score artificiel
  // uniforme (~50) qui écraserait sinon les résultats plus fins du moteur
  // (template/V3/V4) dans le tri final par score. On ne prend que ce qu'il
  // faut pour atteindre un total confortable, avec une petite marge.
  const topUp = (list: Hazard[]) => {
    const room = Math.max(8 - merged.length, 4);
    pushAll(list.slice(0, room));
  };
  if (merged.length < 8 && mappingHazards.length) topUp(mappingHazards);
  if (merged.length < 8 && (presetFromJson.length || fallbackPreset.length)) {
    topUp(presetFromJson);
    topUp(fallbackPreset);
  }
  // Rien de spécifique au secteur n'a été trouvé (templates/moteur/mapping/
  // presets) : on complète avec la bibliothèque générique — à signaler à
  // l'utilisateur, ces risques ne sont pas affinés par secteur.
  const usedGenericFallback = merged.length < 8;
  if (usedGenericFallback) pushAll(riskLibrary);

  const safeId = (h: Hazard) => h.id || `haz-${h.risk.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const hazardMap = new Map<string, Hazard>();
  merged.forEach((h) => hazardMap.set(safeId(h), { ...h, id: safeId(h) }));
  existingLibrary.forEach((h) => hazardMap.set(safeId(h), h));
  const hazardLibrary = Array.from(hazardMap.values());

  const MAX_RISKS = 12;
  const candidates = Array.from(
    new Map(merged.map((h) => [safeId(h), { ...h, id: safeId(h) }])).values()
  )
    .sort((a, b) => {
      const scoreA = ((a as PresetHazard).gravity ?? 7) * ((a as PresetHazard).frequency ?? 6) / Math.max((a as PresetHazard).control ?? 2, 0.5);
      const scoreB = ((b as PresetHazard).gravity ?? 7) * ((b as PresetHazard).frequency ?? 6) / Math.max((b as PresetHazard).control ?? 2, 0.5);
      return scoreB - scoreA;
    })
    .slice(0, MAX_RISKS);

  const targetUnitIds = new Set(targetUnits.map((u) => u.id));
  const remainingAssessments = existingAssessments.filter((a) => !targetUnitIds.has(a.workUnitId));
  const remainingActions = existingActions.filter(
    (a) => !a.assessmentId || !targetUnitIds.has(existingAssessments.find((as) => as.id === a.assessmentId)?.workUnitId || "")
  );

  const assessmentsToAdd: Assessment[] = [];
  targetUnits.forEach((unit) => {
    candidates.forEach((h) => {
      const baseG = (h as PresetHazard).gravity ?? 7;
      const baseF = (h as PresetHazard).frequency ?? 6;
      const baseC = (h as PresetHazard).control ?? 2;
      const { gravity, frequency, control } = applyFeatureAdjustments(baseG, baseF, baseC, unit.features);
      const score = gravity * frequency / Math.max(control, 0.5);
      assessmentsToAdd.push({
        id: uid(),
        workUnitId: unit.id,
        hazardId: h.id,
        hazardCategory: h.category,
        riskLabel: h.risk,
        damages: h.damages,
        existingMeasures: undefined,
        proposedMeasures: h.example_prevention,
        gravity,
        frequency,
        control,
        score,
        priority: computePriority(score),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: h.source,
        sourceUrl: h.sourceUrl,
      });
    });
  });

  // Limite à 2 actions générées max par danger (les plus prioritaires en premier)
  const hazardActionCount = new Map<string, number>();
  const actionableAssessments = [...assessmentsToAdd]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .filter((a) => {
      const key = a.hazardId || a.riskLabel;
      const count = hazardActionCount.get(key) ?? 0;
      if (count >= 2) return false;
      hazardActionCount.set(key, count + 1);
      return true;
    });
  // Dédupliquer par titre d'action généré : un seul "Plan RPS" même si 5 sous-risques RPS
  const allNewActions = actionableAssessments.map((a) => makeActionForAssessment(a, targetEstablishmentId));
  const titleSeenPerUnit = new Map<string, boolean>();
  const newActions = allNewActions.filter((action) => {
    const assessment = assessmentsToAdd.find((a) => a.id === action.assessmentId);
    const unitId = assessment?.workUnitId ?? action.establishmentId ?? "";
    const key = `${unitId}::${action.title}`;
    if (titleSeenPerUnit.has(key)) return false;
    titleSeenPerUnit.set(key, true);
    return true;
  });

  return {
    hazardLibrary,
    assessments: [...remainingAssessments, ...assessmentsToAdd],
    actions: [...remainingActions, ...newActions],
    usedGenericFallback,
  };
}
