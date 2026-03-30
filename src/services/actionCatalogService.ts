import actionsCatalog from "../../config/actions.catalog.json";
import type { ActionItem, Assessment } from "../types";
import { uid } from "../utils/uid";

type CatalogEntry = { risk_id?: string; title?: string; description?: string };

const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const labelToRiskId: Record<string, string> = {
  "atmospheres explosives": "r-atex",
  "incendie et evacuation": "r-incendie",
  "chutes de plain pied et de hauteur": "r-chute-hauteur",
  "machines et equipements de travail": "r-machine",
  "risque electrique": "r-electrique",
  "risque routier professionnel": "r-routier",
  "bruit": "r-bruit",
  "vibrations": "r-vibrations",
  "risques psychosociaux": "r-rps",
  "risques psychosociaux rps": "r-rps",
  "travail sur ecran": "r-ecran",
  "manutention manuelle": "r-manutention",
  "manutentions manuelles et tms": "r-manutention",
  "manutention manuelle et tms": "r-manutention",
  "agents chimiques dangereux": "r-chimique",
  "biologique": "r-bio",
  "glissades": "r-glissades",
  "travail de nuit": "r-night",
  "horaires atypiques travail de nuit": "r-night",
  "travail de nuit equipes alternantes": "r-night",
  "tms": "r-tms",
};

const categoryToRiskId: Record<string, string> = {
  "manutention manuelle": "r-manutention",
  "ergonomie": "r-tms",
  "organisation": "r-rps",
  "travail sur ecran": "r-ecran",
  "bruit": "r-bruit",
  "vibrations": "r-vibrations",
  "risques psychosociaux": "r-rps",
  "travail de nuit": "r-night",
};

const actionsByRisk = (() => {
  const map = new Map<string, CatalogEntry[]>();
  (actionsCatalog as CatalogEntry[]).forEach((a) => {
    if (!a.risk_id) return;
    const key = normalize(a.risk_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  });
  return map;
})();

const pickCatalogAction = (assessment: Assessment): CatalogEntry | undefined => {
  const label = normalize(assessment.riskLabel || "");
  const hazard = normalize(assessment.hazardId || "");
  const category = normalize(assessment.hazardCategory || "");

  const byId = hazard ? actionsByRisk.get(hazard) : undefined;
  if (byId?.length) return byId[0];

  const alias = labelToRiskId[label];
  const byAlias = alias ? actionsByRisk.get(normalize(alias)) : undefined;
  if (byAlias?.length) return byAlias[0];

  const byCategory = category
    ? actionsByRisk.get(categoryToRiskId[category] ? normalize(categoryToRiskId[category]) : "")
    : undefined;
  if (byCategory?.length) return byCategory[0];

  return Array.from(actionsByRisk.values())
    .flat()
    .find((c) => {
      const rid = normalize((c as any).risk_id || "");
      return rid === label || rid.includes(label) || label.includes(rid);
    });
};

export const makeActionForAssessment = (a: Assessment, establishmentId?: string): ActionItem => {
  const catalog = pickCatalogAction(a);
  const title = catalog?.title ?? `Mettre en oeuvre les mesures pour ${a.riskLabel}`;
  const description = catalog?.description ?? "Definir les mesures correctives et les responsables";

  return {
    id: uid(),
    establishmentId: establishmentId ?? a.workUnitId,
    assessmentId: a.id,
    title,
    description,
    steps: [
      { id: uid(), label: "Analyser le risque", done: false },
      { id: uid(), label: "Definir mesures et responsable", done: false },
      { id: uid(), label: "Mettre en oeuvre", done: false },
    ],
    owner: "",
    dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    status: "TO_DO",
    priority: a.priority,
    createdAt: new Date().toISOString(),
  };
};
