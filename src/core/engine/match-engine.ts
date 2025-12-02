import actionsCatalog from "../../config/actions.catalog.json";
import obligationsCatalog from "../../config/obligations.catalog.json";
import type { Action } from "../models/action";
import type { Obligation } from "../models/legal";
import type { Risk } from "../models/risk";

function nafMatch(list: string[] | undefined, nafCode?: string) {
  if (!nafCode || !list || list.length === 0) return true;
  return list.some((code) => nafCode.startsWith(code));
}

function asActions(payload: unknown): Action[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((a) => {
      const base = a as Partial<Action>;
      if (!base?.id || !base?.risk_id) return null;
      return {
        id: String(base.id),
        risk_id: String(base.risk_id),
        title: base.title ? String(base.title) : "",
        type: base.type ? String(base.type) : "Organisation",
        difficulty: base.difficulty ? String(base.difficulty) : "Moyenne",
        cost: base.cost ? String(base.cost) : "Non evalue",
        naf_specific: base.naf_specific ?? [],
        impact: base.impact ? String(base.impact) : "",
      } as Action;
    })
    .filter((a): a is Action => Boolean(a));
}

function asObligations(payload: unknown): Obligation[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((o) => {
      const base = o as Partial<Obligation>;
      if (!base?.id || !base?.title) return null;
      return {
        id: String(base.id),
        title: String(base.title),
        description: base.description ? String(base.description) : "",
        naf_specific: base.naf_specific ?? [],
        risk_ids: base.risk_ids ?? [],
        reference: base.reference,
      } as Obligation;
    })
    .filter((o): o is Obligation => Boolean(o));
}

const actionList = asActions(actionsCatalog);
const obligationList = asObligations(obligationsCatalog);

export function matchActions(risk: Risk, nafCode?: string): Action[] {
  const candidates = actionList.filter((action) => action.risk_id === risk.id && nafMatch(action.naf_specific, nafCode));
  return candidates.sort((a, b) => {
    const aNaf = nafMatch(a.naf_specific, nafCode);
    const bNaf = nafMatch(b.naf_specific, nafCode);
    if (aNaf && !bNaf) return -1;
    if (!aNaf && bNaf) return 1;
    return a.id.localeCompare(b.id);
  });
}

export function matchObligations(risk: Risk, nafCode?: string): Obligation[] {
  const applicable = obligationList.filter(
    (obligation) =>
      nafMatch(obligation.naf_specific, nafCode) &&
      (!obligation.risk_ids || obligation.risk_ids.length === 0 || obligation.risk_ids.includes(risk.id))
  );
  return applicable.sort((a, b) => a.id.localeCompare(b.id));
}
