import risksCatalog from "../../config/risks.catalog.json";
import naf47 from "../../config/naf/47-commerce.json";
import naf56 from "../../config/naf/56-restauration.json";
import naf86 from "../../config/naf/86-sante.json";
import naf88 from "../../config/naf/88-action-sociale.json";
import type { Risk } from "../models/risk";

export interface NAFProfile {
  naf: string;
  label?: string;
  risks_priority?: string[];
  actions_recommended?: string[];
  legal_specific?: string[];
  risks?: Risk[];
}

const nafRegistry: Record<string, NAFProfile> = {
  "47": naf47 as NAFProfile,
  "56": naf56 as NAFProfile,
  "86": naf86 as NAFProfile,
  "88": naf88 as NAFProfile,
};

function asRiskArray(payload: unknown): Risk[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((entry) => {
      const base = entry as Partial<Risk>;
      if (!base?.id || !base?.name) return null;
      return {
        id: String(base.id),
        name: String(base.name),
        category: base.category ? String(base.category) : "General",
        description: base.description ? String(base.description) : "",
        naf_specific: base.naf_specific ?? [],
        units: base.units ?? [],
      } as Risk;
    })
    .filter((r): r is Risk => Boolean(r));
}

export function loadRiskCatalog(): Risk[] {
  return asRiskArray(risksCatalog);
}

export function loadNAFMapping(nafCode: string): NAFProfile | null {
  const key = nafCode.slice(0, 2);
  return nafRegistry[key] ?? null;
}

export function mergeGenericAndSectorRisks(genericRisks: Risk[], sectorRisks?: Risk[]): Risk[] {
  const merged = new Map<string, Risk>();
  genericRisks.forEach((risk) => merged.set(risk.id, risk));
  (sectorRisks || []).forEach((sectorRisk) => {
    const existing = merged.get(sectorRisk.id);
    if (!existing) {
      merged.set(sectorRisk.id, sectorRisk);
      return;
    }

    merged.set(sectorRisk.id, {
      ...existing,
      ...sectorRisk,
      naf_specific: Array.from(new Set([...(existing.naf_specific || []), ...(sectorRisk.naf_specific || [])])),
      units: Array.from(new Set([...(existing.units || []), ...(sectorRisk.units || [])])),
    });
  });
  return Array.from(merged.values());
}

function matchesNaf(risk: Risk, nafCode: string) {
  if (!risk.naf_specific || risk.naf_specific.length === 0) return true;
  return risk.naf_specific.some((code) => nafCode.startsWith(code));
}

function matchesUnity(risk: Risk, unity?: string) {
  if (!unity) return true;
  if (!risk.units || risk.units.length === 0) return true;
  if (risk.units.includes("Tous")) return true;
  return risk.units.some((unit) => unit.toLowerCase() === unity.toLowerCase());
}

export function getRisksFor(nafCode: string, unity?: string): Risk[] {
  const base = loadRiskCatalog();
  const nafProfile = loadNAFMapping(nafCode);
  const sectorRisks = nafProfile?.risks ? asRiskArray(nafProfile.risks) : [];

  const merged = mergeGenericAndSectorRisks(base, sectorRisks).filter(
    (risk) => matchesNaf(risk, nafCode) && matchesUnity(risk, unity)
  );

  if (!nafProfile?.risks_priority?.length) {
    return merged.sort((a, b) => a.name.localeCompare(b.name));
  }

  const priorityIndex = new Map<string, number>();
  nafProfile.risks_priority.forEach((id, idx) => priorityIndex.set(id, idx));
  return merged.sort((a, b) => {
    const pa = priorityIndex.get(a.id);
    const pb = priorityIndex.get(b.id);
    if (pa !== undefined && pb !== undefined && pa !== pb) return pa - pb;
    if (pa !== undefined) return -1;
    if (pb !== undefined) return 1;
    return a.name.localeCompare(b.name);
  });
}
