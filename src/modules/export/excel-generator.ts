import type { ActionPlan } from "../../core/models/action";
import type { DUERP } from "../../core/models/duerp";

function toCsvValue(value: string | number) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes(";")) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function generateActionPlanSheet(duerp: DUERP, plan?: ActionPlan): string {
  const header = ["Risk", "Unity", "Score", "Priority", "Action", "Impact"];
  const lines = [header.join(";")];

  duerp.risks.forEach((evaluation) => {
    const actions = evaluation.matchedActions?.length ? evaluation.matchedActions : duerp.actions.filter((a) => a.risk_id === evaluation.risk.id);
    if (!actions.length) {
      lines.push(
        [
          toCsvValue(evaluation.risk.name),
          toCsvValue(evaluation.unity.name),
          evaluation.score,
          evaluation.priority,
          "Aucune action",
          "",
        ].join(";")
      );
    } else {
      actions.forEach((action) => {
        lines.push(
          [
            toCsvValue(evaluation.risk.name),
            toCsvValue(evaluation.unity.name),
            evaluation.score,
            evaluation.priority,
            toCsvValue(action.title),
            toCsvValue(action.impact),
          ].join(";")
        );
      });
    }
  });

  if (plan) {
    lines.push("");
    lines.push("Plan d'action consolide");
    lines.push(["Action", "Score", "Risques couverts"].join(";"));
    plan.items.forEach((item) => {
      lines.push(
        [toCsvValue(item.action.title), item.priorityScore, toCsvValue(item.relatedRiskIds.join(","))].join(";")
      );
    });
  }

  return lines.join("\n");
}
