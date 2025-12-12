export type AssistRiskInput = {
  id?: string;
  label?: string;
  category?: string;
  severity?: number;
  frequency?: number;
  mastery?: number;
  context?: string;
};

export type AssistRequest = {
  nafCode?: string;
  unitName?: string;
  activity?: string;
  freeText?: string;
  risks?: AssistRiskInput[];
};

export type AssistSuggestion = {
  title: string;
  description: string;
  category?: string;
  rationale?: string;
};

export type AssistResponse = {
  suggestions: AssistSuggestion[];
  notes?: string[];
};

const KEYWORDS: Record<string, { title: string; description: string; category?: string }> = {
  chantier: {
    title: "Chutes et coactivité chantier",
    description: "Vérifier protections collectives, balisage et consignations avant intervention en hauteur ou proche réseaux.",
    category: "Chute / Coactivité",
  },
  machine: {
    title: "Risques machines",
    description: "Contrôler carters, arrêts d'urgence, consignations énergie avant maintenance ou réglage.",
    category: "Machine",
  },
  chimique: {
    title: "Risque chimique",
    description: "Consulter FDS, ventilation adéquate, équipements adaptés et procédures de déversement/stockage.",
    category: "Chimique",
  },
  rps: {
    title: "RPS / charge mentale",
    description: "Analyser charge, autonomie, soutien, prévention violence externe et organisation des astreintes.",
    category: "RPS",
  },
  manutention: {
    title: "Manutentions et TMS",
    description: "Aides mécaniques, réorganisation des gestes répétitifs, rotation des postes et formation gestes/POSTURES.",
    category: "Ergonomie",
  },
  route: {
    title: "Risque routier",
    description: "Planning déplacements, vérification véhicules, gestion fatigue/horaires, kit d’urgence.",
    category: "Routier",
  },
};

const FALLBACK: AssistSuggestion[] = [
  {
    title: "Vérifier les risques majeurs",
    description: "Chutes de hauteur/plan-pied, machine, chimique, incendie, manutention, RPS. S’assurer qu’ils sont évalués.",
  },
  {
    title: "Aligner mesures existantes et actions",
    description: "Lister les protections déjà en place et ce qui manque pour chaque risque prioritaire.",
  },
  {
    title: "Documenter preuves",
    description: "Attestations, photos, rapports de contrôle pour justifier les mesures et actions planifiées.",
  },
];

export function assistV2(payload: AssistRequest): AssistResponse {
  const { activity = "", freeText = "", risks = [] } = payload;
  const text = `${activity} ${freeText}`.toLowerCase();
  const suggestions: AssistSuggestion[] = [];

  const addIfMatch = (keyword: string) => {
    if (text.includes(keyword) && KEYWORDS[keyword]) {
      const entry = KEYWORDS[keyword];
      if (!suggestions.find((s) => s.title === entry.title)) {
        suggestions.push({ ...entry, rationale: `Détecté via activité/contexte: ${keyword}` });
      }
    }
  };

  ["chantier", "machine", "chimique", "rps", "manutention", "route"].forEach(addIfMatch);

  const highRisks = risks.filter((r) => (r.severity ?? 0) * (r.frequency ?? 0) >= 49);
  if (highRisks.length) {
    suggestions.push({
      title: "Rendre les actions vérifiables",
      description: "Pour chaque risque élevé, ajouter responsable, échéance et preuve attendue (photo, PV contrôle).",
      rationale: `${highRisks.length} risque(s) à criticité élevée détectés`,
    });
  }

  if (suggestions.length < 3) {
    FALLBACK.forEach((s) => {
      if (!suggestions.find((x) => x.title === s.title)) suggestions.push(s);
    });
  }

  return {
    suggestions: suggestions.slice(0, 5),
    notes: [
      "L’IA V2 est assistive : aucune évaluation ni plan n’est modifié automatiquement.",
      "Valider et compléter manuellement les risques/actions avant sauvegarde.",
    ],
  };
}
