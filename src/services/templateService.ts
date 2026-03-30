import templates from "../../config/units/templates.json";
import risksCatalog from "../../config/risks.catalog.json";
import type { Hazard } from "../types";

interface UnitTemplate {
  id: string;
  naf_code: string;
  name: string;
  default_risk_ids: string[];
  suggested?: boolean;
}

interface RiskEntry {
  id: string;
  name: string;
  category?: string;
  description?: string;
}

const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function riskToHazard(risk: RiskEntry, nafCode: string): Hazard {
  return {
    id: risk.id,
    category: risk.category || "Securite",
    risk: risk.name,
    damages: risk.description || "",
    example_prevention: "",
    sector: nafCode,
  };
}

/**
 * Retourne les risques spécifiques à un type d'unité de travail,
 * en croisant le code NAF de l'établissement avec le nom/activité de l'unité.
 * Ces risques ont la plus haute priorité dans le pipeline de préfill.
 */
export function getTemplateHazards(
  nafCode: string | undefined,
  unitName: string,
  activity: string | undefined
): Hazard[] {
  const nafPrefix = (nafCode || "").slice(0, 2).toUpperCase();
  const normName = normalize(unitName);
  const normActivity = normalize(activity || "");

  const matched = (templates as unknown as UnitTemplate[]).filter((t) => {
    const tPrefix = t.naf_code.slice(0, 2).toUpperCase();
    const nafMatch = nafPrefix
      ? tPrefix === nafPrefix || t.naf_code.toUpperCase().startsWith(nafPrefix)
      : false;
    const normTemplate = normalize(t.name);
    const nameMatch =
      normName.includes(normTemplate) || normTemplate.includes(normName);
    const activityMatch =
      normActivity.length > 0 &&
      (normActivity.includes(normTemplate) || normTemplate.includes(normActivity));

    // Correspondance stricte : NAF + (nom ou activité)
    if (nafMatch && (nameMatch || activityMatch)) return true;
    // Sans NAF renseigné : correspondance nom/activité seule
    if (!nafCode && (nameMatch || activityMatch)) return true;
    return false;
  });

  if (!matched.length) return [];

  const riskIds = Array.from(new Set(matched.flatMap((t) => t.default_risk_ids)));
  const catalog = risksCatalog as unknown as RiskEntry[];

  return riskIds
    .map((id) => catalog.find((r) => r.id === id))
    .filter((r): r is RiskEntry => Boolean(r?.id && r?.name))
    .map((r) => riskToHazard(r, nafCode || ""));
}
