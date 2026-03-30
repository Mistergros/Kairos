import { riskLibrary } from "../data/riskLibrary";
import { nafPresets } from "../data/nafPresets";
import { buildHazardsFromMapping } from "../data/nafMappingLoader";
import { hazardByNafPrefix } from "../data/sectorHazards";
import { fetchHazardsFromSources } from "../utils/api";
import { RiskEngineV3 } from "../core/engine/risk-engine.v3";
import duerpApi from "./duerpApi";
import { computePriority } from "../utils/score";
import { uid } from "../utils/uid";
import { makeActionForAssessment } from "./actionCatalogService";
import { getTemplateHazards } from "./templateService";
import type { Assessment, ActionItem, Hazard, WorkUnit } from "../types";

const USE_REMOTE_ENGINE = (import.meta as any)?.env?.VITE_USE_REMOTE_ENGINE === "true";

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
    }))
    .sort((a, b) => a.risk.localeCompare(b.risk)) as PresetHazard[];

  // --- 2. Templates spécifiques au type d'unité (priorité maximale) ---
  const templateHazards = getTemplateHazards(naf, primaryUnit?.name || "", primaryUnit?.activity);

  const mappingHazards = buildHazardsFromMapping(naf);
  const presetFromJson = nafPresets[nafPrefix]?.hazards || [];
  const fallbackPreset = hazardByNafPrefix[nafPrefix] || [];
  const fetched = await fetchHazardsFromSources(sector, naf);

  // Pipeline de merge : templates > moteur > mapping > presets > fallback > bibliothèque
  const merged: Hazard[] = [];
  const pushAll = (list: Hazard[]) => list.forEach((h) => merged.push(h));

  if (templateHazards.length) pushAll(templateHazards);
  if (engineHazards.length) pushAll(engineHazards);
  if (merged.length < 8 && mappingHazards.length) pushAll(mappingHazards);
  if (merged.length < 8 && (presetFromJson.length || fallbackPreset.length || fetched.length)) {
    pushAll(presetFromJson);
    pushAll(fallbackPreset);
    pushAll(fetched);
  }
  if (merged.length < 8) pushAll(riskLibrary);

  const safeId = (h: Hazard) => h.id || `haz-${h.risk.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const hazardMap = new Map<string, Hazard>();
  merged.forEach((h) => hazardMap.set(safeId(h), { ...h, id: safeId(h) }));
  existingLibrary.forEach((h) => hazardMap.set(safeId(h), h));
  const hazardLibrary = Array.from(hazardMap.values());

  const candidates = Array.from(
    new Map(merged.map((h) => [safeId(h), { ...h, id: safeId(h) }])).values()
  ).sort((a, b) => `${a.category}-${a.risk}`.localeCompare(`${b.category}-${b.risk}`));

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
      });
    });
  });

  const newActions = assessmentsToAdd.map((a) => makeActionForAssessment(a, targetEstablishmentId));

  return {
    hazardLibrary,
    assessments: [...remainingAssessments, ...assessmentsToAdd],
    actions: [...remainingActions, ...newActions],
  };
}
