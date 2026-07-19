import type { ActionItem, Assessment } from "../types";
import { uid } from "../utils/uid";

export type CatalogAction = {
  id: string;
  risk_id?: string;
  title: string;
  description?: string;
  references?: string[];
  // URL officielle verifiee (meme ordre que `references`), quand trouvee.
  // Chaine vide si aucun lien fiable trouve pour cette reference precise.
  referenceUrls?: string[];
};

// Catalogue V4 (config/actions/*.json, 27 fichiers, un par risque) — le plus
// riche des catalogues d'actions du projet et le seul avec un champ
// `references` (voir REFERENTIELS.md, audit du 19/07/2026). Chargé une fois
// au build via import.meta.glob, fusionné en une seule liste plate.
const actionFiles = import.meta.glob("../../config/actions/*.json", { eager: true }) as Record<
  string,
  { default: CatalogAction[] }
>;
const allActions: CatalogAction[] = Object.values(actionFiles).flatMap((mod) => mod.default);

export const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Alias label/catégorie -> id de risque (config/risks/*.json). Source unique :
// avant le 19/07/2026, cette table existait en double (ici et dans
// ActionPlan.tsx), avec un risque documenté de dérive entre les deux copies.
export const labelToRiskId: Record<string, string> = {
  "atmospheres explosives": "r-atex",
  "incendie et evacuation": "r-incendie",
  "chutes de plain pied et de hauteur": "r-chute-hauteur",
  "machines et equipements de travail": "r-machine",
  "risque electrique": "r-electrique",
  "risque routier professionnel": "r-routier",
  "bruit": "r-bruit",
  "vibrations": "r-vibrations",
  "tms": "r-tms",
  "risques psychosociaux": "r-rps",
  "risques psychosociaux rps": "r-rps",
  "charge mentale": "r-rps",
  "conflits tensions": "r-rps",
  "conflits et tensions": "r-rps",
  "violence externe": "r-rps",
  "organisation du travail": "r-rps",
  "equilibre vie pro perso": "r-rps",
  "harcelement": "r-rps",
  "stress": "r-rps",
  "burn out": "r-rps",
  "travail sur ecran": "r-ecran",
  "horaires atypiques travail de nuit": "r-night",
  "travail de nuit equipes alternantes": "r-night",
  "manutention manuelle": "r-manutention",
  "manutentions manuelles et tms": "r-manutention",
  "manutention manuelle et tms": "r-manutention",
  "agents chimiques dangereux": "r-chimique",
  "biologique": "r-bio",
  "glissades": "r-glissades",
  "travail de nuit": "r-night",
  "qualite de l air interieur": "r-qualiteair",
  "qualite de l air": "r-qualiteair",
};

export const categoryToRiskId: Record<string, string> = {
  "manutention manuelle": "r-manutention",
  "ergonomie": "r-tms",
  "organisation": "r-rps",
  "organisationnel": "r-rps",
  "travail sur ecran": "r-ecran",
  "bruit": "r-bruit",
  "vibrations": "r-vibrations",
  "risques psychosociaux": "r-rps",
  "travail de nuit": "r-night",
  "physique": "r-tms",
  "accidentel": "r-chute-hauteur",
  "chimique": "r-chimique",
  "biologique": "r-bio",
  "environnemental": "r-qualiteair",
};

const actionsByRisk = (() => {
  const map = new Map<string, CatalogAction[]>();
  allActions.forEach((a) => {
    if (!a.risk_id) return;
    const key = normalize(a.risk_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  });
  return map;
})();

// Retourne toutes les actions catalogue correspondant à un risque évalué,
// en essayant successivement : id exact, alias de libellé, alias de
// catégorie, puis correspondance approximative sur le risk_id en dernier
// recours. Utilisée à la fois pour générer l'action automatique (ci-dessous)
// et pour la vue "Plan d'action" (src/pages/ActionPlan.tsx).
export const getCatalogActionsForAssessment = (assessment?: Assessment): CatalogAction[] => {
  if (!assessment) return [];
  const riskId = assessment.hazardId ? normalize(assessment.hazardId) : "";
  const riskLabel = normalize(assessment.riskLabel || "");
  const riskCategory = normalize(assessment.hazardCategory || "");

  const byId = riskId ? actionsByRisk.get(riskId) : undefined;
  if (byId?.length) return byId;

  const aliasId = labelToRiskId[riskLabel];
  const byAlias = aliasId ? actionsByRisk.get(normalize(aliasId)) : undefined;
  if (byAlias?.length) return byAlias;

  const catId = categoryToRiskId[riskCategory];
  const byCat = catId ? actionsByRisk.get(normalize(catId)) : undefined;
  if (byCat?.length) return byCat;

  const matches = allActions.filter((a) => {
    const rid = normalize(a.risk_id || "");
    return rid === riskLabel || rid.includes(riskLabel) || riskLabel.includes(rid);
  });
  return matches;
};

export const makeActionForAssessment = (a: Assessment, establishmentId?: string): ActionItem => {
  const catalog = getCatalogActionsForAssessment(a)[0];
  const title = catalog?.title ?? `Mettre en oeuvre les mesures pour ${a.riskLabel}`;
  const description = catalog?.description ?? "Definir les mesures correctives et les responsables";

  return {
    id: uid(),
    establishmentId: establishmentId ?? a.workUnitId,
    assessmentId: a.id,
    title,
    description,
    steps: [],
    owner: "",
    dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    status: "TO_DO",
    priority: a.priority,
    createdAt: new Date().toISOString(),
  };
};
