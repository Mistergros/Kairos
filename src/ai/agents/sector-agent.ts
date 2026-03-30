import { RiskEngineV3 } from "../../core/engine/risk-engine.v3";

export interface SectorInsight {
  naf: string;
  topRisks: string[];
  recommendedActions: string[];
}

export function describeSector(nafCode: string): SectorInsight | null {
  const engine = new RiskEngineV3();
  const risks = engine.getRisks({ nafCode });
  if (!risks.length) return null;
  return {
    naf: nafCode,
    topRisks: risks.slice(0, 5).map((r) => r.id),
    recommendedActions: [],
  };
}
