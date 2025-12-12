import type { Action } from "../../core/models/action";
import { embed, search, EmbeddedDocument } from "../rag";

export function rankActions(prompt: string, actions: Action[], limit = 3): Action[] {
  const corpus: EmbeddedDocument[] = actions.map((action) => ({
    id: action.id,
    text: `${action.title} ${String(
      typeof action.impact === "string" ? action.impact : JSON.stringify(action.impact || {})
    )}`,
    vector: embed(
      `${action.title} ${String(
        typeof action.impact === "string" ? action.impact : JSON.stringify(action.impact || {})
      )}`
    ),
    metadata: { risk: action.risk_id || (action as any).related_risk_ids?.[0] || "" },
  }));

  const results = search(prompt, corpus, limit);
  const idSet = new Set(results.map((r) => r.id));
  return actions.filter((action) => idSet.has(action.id));
}
