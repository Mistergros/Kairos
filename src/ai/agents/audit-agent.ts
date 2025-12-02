import type { DUERP } from "../../core/models/duerp";

export interface AuditInsight {
  message: string;
  severity: "info" | "warning" | "critical";
}

export function analyze(duerp: DUERP): AuditInsight[] {
  const insights: AuditInsight[] = [];
  const staleRisks = duerp.risks.filter((r) => r.score > 80);
  if (staleRisks.length) {
    insights.push({
      message: `${staleRisks.length} risques ont un score eleve et necessitent des actions immediates`,
      severity: "critical",
    });
  }
  if (!duerp.history.length) {
    insights.push({ message: "Aucun historique d'audit disponible", severity: "warning" });
  }
  return insights;
}
