import { loadNAFMapping } from "../../core/engine/risk-engine";

export interface SectorInsight {
  naf: string;
  label?: string;
  topRisks: string[];
  recommendedActions: string[];
}

export function describeSector(nafCode: string): SectorInsight | null {
  const profile = loadNAFMapping(nafCode);
  if (!profile) return null;
  return {
    naf: profile.naf,
    label: profile.label,
    topRisks: profile.risks_priority || [],
    recommendedActions: profile.actions_recommended || [],
  };
}
