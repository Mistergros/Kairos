import { callLLM } from "./llm.js";

type IncomingRisk = {
  id?: string;
  label?: string;
  category?: string;
  severity?: number;
  frequency?: number;
  mastery?: number;
  context?: string;
};

type IncomingPayload = {
  nafCode?: string;
  unitName?: string;
  activity?: string;
  freeText?: string;
  risks?: IncomingRisk[];
};

export type AssistPayload = IncomingPayload;

export type AssistLLMResult = {
  explanations: string[];
  narrative: string;
  inconsistencies: string[];
  recommendations: string[];
  suggestions?: { title: string; description: string; category?: string }[];
  fallback: boolean;
};

const FALLBACK_RESULT: AssistLLMResult = {
  explanations: ["Analyse assistive basée sur le texte fourni (IA activée)."],
  narrative: "Résumé indisponible : utilisez les filtres et la grille pour affiner les risques.",
  inconsistencies: ["Aucune incohérence détectée automatiquement."],
  recommendations: [
    "Revoir les risques majeurs (chute, machine, chimique, incendie, manutention, RPS).",
    "Ajouter responsables/échéances sur les actions critiques.",
    "Conserver des preuves (photos, PV, attestations) pour chaque mesure.",
  ],
  fallback: true,
};

const TEMPLATES = {
  explain: (naf: string, unit: string, activity: string) =>
    `Contexte ${naf || "NAF n.c."} / ${unit || "Unité n.c."}${activity ? `, activité ${activity}` : ""}.`,
  narrative: (risks: IncomingRisk[]) =>
    risks.length
      ? `Principaux risques mentionnés: ${risks
          .slice(0, 5)
          .map((r) => r.label || r.category || r.id || "risque")
          .join(", ")}.`
      : "Aucun risque transmis; compléter la sélection pour obtenir un résumé.",
};

function buildPrompt(payload: AssistPayload): string {
  const { nafCode, unitName, activity, freeText = "", risks = [] } = payload;
  const riskLines = risks
    .map(
      (r, idx) =>
        `R${idx + 1}: ${r.label || r.id || "risque"} [cat=${r.category || "-"}, G=${r.severity ?? "-"}, F=${
          r.frequency ?? "-"
        }, P=${r.mastery ?? "-"}] ctx=${r.context || "-"}`
    )
    .join("\n");

  return [
    "Tu es un assistant textuel DUERP. Tu génères UNIQUEMENT des textes :",
    "- explanations : 1-3 phrases courtes",
    "- narrative : 1 paragraphe court",
    "- inconsistencies : liste de points textuels à vérifier",
    "- recommendations : liste de propositions textuelles",
    "Tu ne modifies jamais les risques/actions/obligations existants.",
    "Format attendu (texte libre, pas de JSON) :",
    "EXPLANATIONS:",
    "NARRATIVE:",
    "INCONSISTENCIES:",
    "RECOMMENDATIONS:",
    "",
    `Contexte: NAF=${nafCode || "n.c."}, unité=${unitName || "n.c."}, activité=${activity || "n.c."}`,
    `Texte libre: ${freeText || "-"}`,
    "Risques:",
    riskLines || "-",
  ].join("\n");
}

function parseLines(block: string): string[] {
  return block
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function parseLLMOutput(text: string, payload: AssistPayload): AssistLLMResult {
  const lower = text.toLowerCase();
  const sections = {
    explanations: [] as string[],
    narrative: "",
    inconsistencies: [] as string[],
    recommendations: [] as string[],
  };

  const grab = (tag: string) => {
    const regex = new RegExp(`${tag}:([\\s\\S]*?)(?=\\n[A-Z ]+:|$)`, "i");
    const match = regex.exec(text);
    return match?.[1]?.trim() || "";
  };

  const explanations = parseLines(grab("EXPLANATIONS") || grab("EXPLICATIONS"));
  const narrative = (grab("NARRATIVE") || grab("RESUME") || "").trim();
  const inconsistencies = parseLines(grab("INCONSISTENCIES") || grab("POINTS") || grab("CHECK"));
  const recommendations = parseLines(grab("RECOMMENDATIONS") || grab("ACTIONS") || grab("SUGGESTIONS"));

  if (explanations.length) sections.explanations = explanations;
  if (narrative) sections.narrative = narrative;
  if (inconsistencies.length) sections.inconsistencies = inconsistencies;
  if (recommendations.length) sections.recommendations = recommendations;

  const fallback = sections.explanations.length === 0 && !sections.narrative && sections.recommendations.length === 0;

  if (fallback) {
    return {
      ...FALLBACK_RESULT,
      explanations: [TEMPLATES.explain(payload.nafCode || "", payload.unitName || "", payload.activity || "")],
      narrative: TEMPLATES.narrative(payload.risks || []),
    };
  }

  return {
    explanations: sections.explanations.length ? sections.explanations : FALLBACK_RESULT.explanations,
    narrative: sections.narrative || TEMPLATES.narrative(payload.risks || []),
    inconsistencies: sections.inconsistencies.length ? sections.inconsistencies : FALLBACK_RESULT.inconsistencies,
    recommendations: sections.recommendations.length ? sections.recommendations : FALLBACK_RESULT.recommendations,
    fallback: false,
  };
}

export async function generateAssistResponse(payload: AssistPayload): Promise<AssistLLMResult> {
  try {
    const prompt = buildPrompt(payload);
    const raw = await callLLM(prompt);
    const parsed = parseLLMOutput(raw, payload);
    return parsed;
  } catch {
    return FALLBACK_RESULT;
  }
}
