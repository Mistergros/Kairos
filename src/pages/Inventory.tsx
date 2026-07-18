import { ChangeEvent, Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { PriorityBadge } from "../components/Badge";
import { useDuerpStore } from "../state/store";
import { Assessment, Priority } from "../types";

type Filters = {
  search: string;
  category: string;
  priority?: Priority;
};

export const Inventory = () => {
  const navigate = useNavigate();
  const {
    assessments,
    hazardLibrary,
    selectedEstablishmentId,
    selectedWorkUnitId,
    workUnits,
    establishments,
    setSelectedWorkUnit,
    addHazard,
    addAssessment,
    updateAssessment,
    removeAssessment,
    prefillFromSector,
    loadingHazards,
    prefillWarning,
    dismissPrefillWarning,
  } = useDuerpStore();

  const currentEstablishment = establishments.find((e) => e.id === selectedEstablishmentId);
  const currentUnit = workUnits.find((u) => u.id === selectedWorkUnitId);
  const [filters, setFilters] = useState<Filters>({ search: "", category: "" });
  const [prioritySort, setPrioritySort] = useState<"asc" | "desc">("asc");
  const [sectorInput, setSectorInput] = useState(currentEstablishment?.codeNaf || currentEstablishment?.sector || "");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  type QAnswers = { q1: string; q2: string; q3: string; q4: string };
  const [questAnswers, setQuestAnswers] = useState<Record<string, QAnswers>>({});

  const Q1_MAP: Record<string, number> = { gêne: 3, arrêt_court: 5, arrêt_long: 8, invalidité: 10 };
  const Q2_MAP: Record<string, number> = { rare: 2, mensuel: 4, hebdo: 6, quotidien: 9 };
  const Q3_MAP: Record<string, number> = { aucune: 0, informelle: 1, formalisée: 2, vérifiée: 3 };
  const Q4_MAP: Record<string, number> = { non: 0, partiel: 1, systématique: 2 };

  type QOption = { val: string; label: string; hint?: string };
  type QDef = { question: string; hint?: string; options: QOption[] };

  const getQ3Q4 = (category: string): { q3: QDef; q4: QDef } => {
    const cat = (category || "").toLowerCase();
    if (cat.includes("psychosocial") || cat.includes("rps")) {
      return {
        q3: {
          question: "3. Des mesures de prévention sont-elles en place contre ce risque ?",
          hint: "Ex : charte de bonne conduite, droit à la déconnexion, espaces de dialogue, médiation RH, accord télétravail, enquête satisfaction…",
          options: [
            { val: "aucune", label: "Aucune mesure", hint: "Le risque n'est pas adressé formellement" },
            { val: "informelle", label: "Actions ponctuelles", hint: "Ex : réunion d'équipe occasionnelle, discussion informelle avec le manager" },
            { val: "formalisée", label: "Politique écrite et affichée", hint: "Ex : charte, accord collectif, procédure RH documentée et communiquée" },
            { val: "vérifiée", label: "Dispositif actif et suivi", hint: "Ex : baromètre social annuel, référent RPS désigné, indicateurs de suivi" },
          ],
        },
        q4: {
          question: "4. Les encadrants sont-ils formés à détecter et gérer ce type de situation ?",
          hint: "Les managers de proximité sont souvent les premiers à percevoir les signaux faibles (absentéisme, tensions, isolement).",
          options: [
            { val: "non", label: "Non formés", hint: "Aucune formation managériale sur ce sujet" },
            { val: "partiel", label: "Sensibilisés ponctuellement", hint: "Ex : une demi-journée de sensibilisation, e-learning obligatoire" },
            { val: "systématique", label: "Formés et outillés", hint: "Ex : formation certifiante, guide de l'entretien de retour, protocole d'alerte RH" },
          ],
        },
      };
    }
    if (cat.includes("tms") || cat.includes("ergon") || cat.includes("musculo")) {
      return {
        q3: {
          question: "3. Des aménagements du poste de travail ont-ils été réalisés ?",
          hint: "Les TMS (troubles musculo-squelettiques) touchent dos, épaules, poignets… Ils sont liés aux postures, répétitions et efforts. Les protections collectives passent par l'organisation du travail et l'ergonomie du poste.",
          options: [
            { val: "aucune", label: "Aucun aménagement", hint: "Poste non évalué ergonomiquement" },
            { val: "informelle", label: "Quelques ajustements", hint: "Ex : chaise réglée, écran repositionné, sans évaluation formelle" },
            { val: "formalisée", label: "Étude ergonomique réalisée", hint: "Ex : intervention d'un ergonome, fiche de poste, rotation des tâches planifiée" },
            { val: "vérifiée", label: "Aménagements réévalués régulièrement", hint: "Ex : visite annuelle du médecin du travail, mise à jour à chaque changement de poste" },
          ],
        },
        q4: {
          question: "4. Les salariés sont-ils formés aux gestes et postures adaptés ?",
          hint: "Une formation gestes et postures apprend à soulever, porter et se positionner correctement pour limiter les contraintes articulaires.",
          options: [
            { val: "non", label: "Aucune formation", hint: "Les salariés apprennent sur le tas" },
            { val: "partiel", label: "Formation à l'embauche uniquement", hint: "Intégration avec démonstration, sans recyclage" },
            { val: "systématique", label: "Formation régulière et recyclage", hint: "Ex : formation tous les 2-3 ans, remise à niveau après arrêt maladie" },
          ],
        },
      };
    }
    if (cat.includes("électr") || cat.includes("electr")) {
      return {
        q3: {
          question: "3. Les procédures de sécurité électrique sont-elles appliquées ?",
          hint: "La consignation = mise hors tension + verrouillage avant toute intervention. L'habilitation = autorisation délivrée par l'employeur après formation (niveaux B0, H0, BR, BC…).",
          options: [
            { val: "aucune", label: "Aucune procédure", hint: "Interventions sans consignation ni habilitation formelle" },
            { val: "informelle", label: "Pratiques non formalisées", hint: "Les bonnes pratiques existent mais ne sont pas écrites ni vérifiées" },
            { val: "formalisée", label: "Procédures écrites appliquées", hint: "Ex : fiches de consignation, registre des habilitations tenu à jour" },
            { val: "vérifiée", label: "Contrôles réguliers effectués", hint: "Ex : vérification périodique des installations, audit électrique annuel" },
          ],
        },
        q4: {
          question: "4. Les habilitations électriques du personnel concerné sont-elles à jour ?",
          hint: "Une habilitation électrique (NF C 18-510) est délivrée par l'employeur. Elle doit être renouvelée tous les 3 ans environ et adaptée au niveau d'intervention (B1, H1, BR, BC…).",
          options: [
            { val: "non", label: "Non ou inconnues", hint: "Aucun registre, habilitations non vérifiées" },
            { val: "partiel", label: "Partiellement à jour", hint: "Certains salariés habilités, d'autres non ou expirés" },
            { val: "systématique", label: "Toutes à jour et vérifiées", hint: "Registre tenu, renouvellements anticipés, recyclage planifié" },
          ],
        },
      };
    }
    if (cat.includes("incendie") || cat.includes("explosion") || cat.includes("atex")) {
      return {
        q3: {
          question: "3. Les moyens de prévention et de lutte contre l'incendie sont-ils en place ?",
          hint: "Cela inclut : extincteurs (vérifiés annuellement), RIA (robinets d'incendie armés), détecteurs de fumée, plan d'évacuation affiché, issues de secours dégagées.",
          options: [
            { val: "aucune", label: "Aucun moyen", hint: "Pas d'extincteur vérifié, pas de plan d'évacuation" },
            { val: "informelle", label: "Équipements présents, sans procédure", hint: "Ex : extincteurs non vérifiés, sorties de secours non signalées" },
            { val: "formalisée", label: "Équipements conformes + plan affiché", hint: "Ex : extincteurs vérifiés, plan d'évacuation affiché, référent sécurité désigné" },
            { val: "vérifiée", label: "Dispositif complet et testé", hint: "Ex : exercice d'évacuation annuel, registre de sécurité tenu, vérification périodique des installations" },
          ],
        },
        q4: {
          question: "4. Le personnel est-il formé aux conduites à tenir en cas d'incendie ?",
          hint: "Savoir déclencher l'alarme, évacuer calmement, utiliser un extincteur (technique PASS : Pointer, Armer, Shooter, Sweeper), ne pas utiliser l'ascenseur.",
          options: [
            { val: "non", label: "Aucune formation", hint: "Le personnel ne sait pas quoi faire en cas d'incendie" },
            { val: "partiel", label: "Sensibilisation sans exercice pratique", hint: "Ex : affichage des consignes, information orale, sans simulation" },
            { val: "systématique", label: "Exercice d'évacuation annuel réalisé", hint: "Ex : exercice chronométré, formation extincteur, équipiers de première intervention désignés" },
          ],
        },
      };
    }
    if (cat.includes("chimique") || cat.includes("biologique") || cat.includes("cmr")) {
      return {
        q3: {
          question: "3. Les procédures de manipulation et de stockage des produits sont-elles formalisées ?",
          hint: "FDS = Fiche de Données de Sécurité (obligatoire pour tout produit chimique). Elle indique les risques, les EPI requis et les mesures d'urgence. CMR = Cancérogène, Mutagène, Reprotoxique.",
          options: [
            { val: "aucune", label: "Aucune procédure, FDS non consultées", hint: "Les produits sont utilisés sans information sur leurs dangers" },
            { val: "informelle", label: "FDS disponibles mais non utilisées", hint: "Les fiches existent mais ne sont pas accessibles au poste de travail" },
            { val: "formalisée", label: "FDS affichées, procédures écrites", hint: "Ex : étiquetage SGH, armoire de stockage adaptée, procédure d'élimination des déchets" },
            { val: "vérifiée", label: "Procédures vérifiées et FDS à jour", hint: "Ex : mise à jour annuelle des FDS, substitution des CMR étudiée, registre des expositions tenu" },
          ],
        },
        q4: {
          question: "4. Les équipements de protection individuelle (EPI) adaptés sont-ils fournis et portés ?",
          hint: "Les EPI chimiques incluent : gants résistants aux solvants, lunettes de protection, masque avec filtre adapté (A, B, P…), tablier. Ils doivent être adaptés au produit spécifique, pas génériques.",
          options: [
            { val: "non", label: "Aucun EPI fourni", hint: "Les salariés manipulent sans protection individuelle" },
            { val: "partiel", label: "EPI fournis mais portage irrégulier", hint: "Les équipements existent mais ne sont pas toujours utilisés (inconfort, habitude…)" },
            { val: "systématique", label: "EPI adaptés, port systématique contrôlé", hint: "Ex : EPI adaptés à chaque produit, contrôle du port par le responsable, renouvellement planifié" },
          ],
        },
      };
    }
    // Défaut : risques physiques, mécaniques, bruit, chute, circulation, etc.
    return {
      q3: {
        question: "3. Des protections collectives ou procédures sont-elles en place ?",
        hint: "Les protections collectives protègent tous les salariés sans action de leur part (garde-corps, capot de machine, aspiration, signalisation…). Elles sont prioritaires sur les EPI.",
        options: [
          { val: "aucune", label: "Aucune protection", hint: "Aucun dispositif collectif, aucune procédure écrite" },
          { val: "informelle", label: "Pratiques orales, non formalisées", hint: "Ex : consignes verbales du chef d'équipe, sans écrit ni vérification" },
          { val: "formalisée", label: "Procédures écrites et affichées", hint: "Ex : mode opératoire au poste, consignes de sécurité machine, signalisation au sol" },
          { val: "vérifiée", label: "Dispositifs vérifiés régulièrement", hint: "Ex : vérification périodique des équipements, mise à jour des procédures, contrôle de conformité" },
        ],
      },
      q4: {
        question: "4. Les équipements de protection individuelle (EPI) sont-ils fournis et portés ?",
        hint: "Les EPI sont le dernier recours quand la protection collective est insuffisante. Exemples : casque, chaussures de sécurité, gilet haute visibilité, protège-oreilles, lunettes, harnais… Ils doivent être adaptés au risque et entretenus.",
        options: [
          { val: "non", label: "Aucun EPI fourni", hint: "Les salariés travaillent sans équipement de protection" },
          { val: "partiel", label: "EPI fournis mais portage irrégulier", hint: "Ex : casques disponibles mais non portés systématiquement, chaussures de sécurité non imposées" },
          { val: "systématique", label: "EPI adaptés, port systématique et contrôlé", hint: "Ex : EPI fournis dès l'embauche, affichage obligatoire aux zones à risque, vérification régulière" },
        ],
      },
    };
  };

  const applyQuestionnaire = (assessmentId: string, answers: QAnswers) => {
    const { q1, q2, q3, q4 } = answers;
    if (!q1 || !q2 || !q3 || !q4) return;
    const gravity = Q1_MAP[q1];
    const frequency = Q2_MAP[q2];
    const control = Math.max(Q3_MAP[q3] + Q4_MAP[q4], 0.5);
    updateAssessment(assessmentId, { gravity, frequency, control });
  };

  const openQuestionnaire = (assessmentId: string) => {
    setExpandedId((prev) => (prev === assessmentId ? null : assessmentId));
    if (!questAnswers[assessmentId]) {
      setQuestAnswers((prev) => ({ ...prev, [assessmentId]: { q1: "", q2: "", q3: "", q4: "" } }));
    }
  };
  const [newRiskMode, setNewRiskMode] = useState<boolean>(false);
  const [newRisk, setNewRisk] = useState({ id: "", category: "", risk: "", damages: "" });
  const [libraryCategory, setLibraryCategory] = useState<string>(hazardLibrary[0]?.category || "");
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [addInfo, setAddInfo] = useState<string>("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;
  const [form, setForm] = useState({
    hazardId: hazardLibrary[0]?.id || "",
    gravity: 7,
    frequency: 5,
    control: 1,
    existingMeasures: "",
    proposedMeasures: "",
  });

  const categories = useMemo(() => Array.from(new Set(hazardLibrary.map((h) => h.category))), [hazardLibrary]);
  const hazardsForCategory = useMemo(() => {
    const scoped = hazardLibrary.filter((h) => h.category === libraryCategory);
    return scoped.length ? scoped : hazardLibrary;
  }, [hazardLibrary, libraryCategory]);

  const currentAssessments = useMemo(
    () => assessments.filter((a) => !selectedWorkUnitId || a.workUnitId === selectedWorkUnitId),
    [assessments, selectedWorkUnitId]
  );

  const filtered = useMemo(() => {
    const base = currentAssessments
      .filter((a) => (filters.category ? a.hazardCategory === filters.category : true))
      .filter((a) => (filters.priority ? a.priority === filters.priority : true))
      .filter((a) =>
        filters.search
          ? `${a.riskLabel} ${a.hazardCategory}`.toLowerCase().includes(filters.search.toLowerCase())
          : true
      );
    return [...base].sort((a, b) => {
      if (a.priority !== b.priority) {
        return prioritySort === "asc" ? a.priority - b.priority : b.priority - a.priority;
      }
      return b.score - a.score;
    });
  }, [currentAssessments, filters, prioritySort]);

  useEffect(() => {
    if (expandedId === null) {
      setOrderIds(filtered.map((a) => a.id));
    }
  }, [filtered, expandedId]);

  useEffect(() => {
    setPage(0);
  }, [filters, selectedWorkUnitId]);

  const filteredMap = useMemo(() => new Map(filtered.map((a) => [a.id, a])), [filtered]);
  const sorted = expandedId === null
    ? filtered
    : orderIds
        .map((id) => filteredMap.get(id))
        .filter((v): v is Assessment => Boolean(v));

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleAssessments = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, Assessment[]>();
    visibleAssessments.forEach((a) => {
      const key = a.hazardCategory || "Autres";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return Array.from(map.entries());
  }, [visibleAssessments]);

  const addRisk = () => {
    // Fallback unité : si aucune sélection mais des unités existent dans l'établissement
    const targetUnitId =
      selectedWorkUnitId ||
      workUnits.find((u) => !selectedEstablishmentId || u.establishmentId === selectedEstablishmentId)?.id;
    if (!targetUnitId) return;

    let hazardId = form.hazardId || hazardLibrary[0]?.id || "";
    if (newRiskMode) {
      const id = newRisk.id.trim() || `haz-${newRisk.risk.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const category = newRisk.category.trim() || "Autres";
      const riskLabel = newRisk.risk.trim();
      if (!riskLabel) return;
      addHazard({ id, category, risk: riskLabel, damages: newRisk.damages });
      hazardId = id;
    }

    if (!hazardId) return;
    addAssessment({
      ...form,
      hazardId,
      workUnitId: targetUnitId,
    });

    if (newRiskMode) {
      setNewRisk({ id: "", category: "", risk: "", damages: "" });
      setNewRiskMode(false);
    }
    setForm((v) => ({ ...v, existingMeasures: "", proposedMeasures: "" }));
    setAddInfo("Risque ajouté");
    setTimeout(() => setAddInfo(""), 2000);
  };

  // Synchronise la catégorie/référence de risque sélectionnée avec la bibliothèque filtrée
  useEffect(() => {
    if (newRiskMode || !hazardLibrary.length) return;
    const currentHazard = hazardLibrary.find((h) => h.id === form.hazardId);
    const fallbackCategory = libraryCategory || hazardLibrary[0]?.category || "";
    const targetCategory = currentHazard?.category || fallbackCategory;
    const hazardsForCategory = hazardLibrary.filter((h) => h.category === targetCategory);
    const nextHazard = currentHazard || hazardsForCategory[0] || hazardLibrary[0];

    if (targetCategory && targetCategory !== libraryCategory) {
      setLibraryCategory(targetCategory);
    }
    if (nextHazard && nextHazard.id !== form.hazardId) {
      setForm((v) => ({ ...v, hazardId: nextHazard.id }));
    }
  }, [hazardLibrary, form.hazardId, newRiskMode, libraryCategory]);

  const onSelectLibraryCategory = (cat: string) => {
    setLibraryCategory(cat);
    const candidate = hazardLibrary.find((h) => h.category === cat);
    setForm((v) => ({ ...v, hazardId: candidate ? candidate.id : "" }));
  };

  const onChangeScore = (assessment: Assessment, field: "gravity" | "frequency" | "control", value: number) => {
    updateAssessment(assessment.id, { [field]: value });
  };


  return (
    <div className="space-y-5">
      <Card
        title="Inventaire des risques"
        subtitle="Grille des risques, cotations et priorisation"
        corner={
          <div className="flex items-center gap-2">
            <div className="text-sm text-slate/60">
              Unité: <span className="font-semibold text-slate-800">{currentUnit?.name || "Non selectionnee"}</span>
              {currentUnit?.activity ? ` - Activité: ${currentUnit.activity}` : ""}
            </div>
            <input
              className="rounded-xl border border-slate/20 px-3 py-2 text-sm"
              placeholder="Recherche..."
              title="Filtrer par texte (risque ou categorie)"
              value={filters.search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
        }
      >
        <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-slate/70">
          <span className="rounded-full bg-slate/10 px-3 py-1 font-semibold text-slate-800">
            NAF etablissement : {currentEstablishment?.codeNaf || sectorInput || "Non renseigne"}
          </span>
          <span className="rounded-full bg-slate/10 px-3 py-1">
            Activité unité : {currentUnit?.activity || "Non renseignee"}
          </span>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate/60">Unités</span>
          <div className="flex flex-wrap gap-2">
            {workUnits
              .filter((u) => !currentEstablishment?.id || u.establishmentId === currentEstablishment.id)
              .map((u) => (
                <button
                  key={u.id}
                  className={`rounded-full border px-3 py-1 text-sm shadow-sm transition ${
                    u.id === selectedWorkUnitId
                      ? "border-ocean bg-ocean/10 text-ocean font-semibold"
                      : "border-slate/20 bg-white text-slate-700 hover:border-slate/40"
                  }`}
                  onClick={() => setSelectedWorkUnit(u.id)}
                >
                  {u.name}
                  {u.activity ? ` - ${u.activity}` : ""}
                </button>
              ))}
          </div>
          {workUnits.filter((u) => !currentEstablishment?.id || u.establishmentId === currentEstablishment.id).length === 0 && (
            <span className="text-xs text-slate/60">Aucune unité. Ajoutez-en dans l'onglet Unités.</span>
          )}
        </div>

        {/* Empty state quand aucun risque */}
        {assessments.length === 0 && (
          <div className="mb-4 rounded-2xl border-2 border-dashed border-kairos/25 bg-kairos/3 px-6 py-8 text-center">
            <p className="text-3xl mb-2">🔍</p>
            <p className="font-semibold text-ink text-base mb-1">Aucun risque identifié</p>
            <p className="text-sm text-slate/60 mb-4">
              Saisissez votre code NAF ci-dessous et cliquez sur « Pré-remplir » pour générer automatiquement les risques
              adaptés à votre secteur d'activité.
            </p>
            <p className="text-xs text-slate/40">Vous pourrez ensuite ajuster, supprimer ou ajouter des risques manuellement.</p>
          </div>
        )}

        <div className="mb-3 rounded-xl bg-slate/5 px-3 py-2 text-xs text-slate/70">
          Astuce : 1) Saisissez le code NAF/secteur puis « Pré-remplir » pour charger les risques de votre secteur. 2) Ajustez G/F/P
          ou utilisez le questionnaire de pondération. 3) Supprimez les risques non pertinents.
        </div>

        {prefillWarning && (
          <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span>⚠️ {prefillWarning}</span>
            <button className="shrink-0 font-semibold underline hover:no-underline" onClick={dismissPrefillWarning}>
              Masquer
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              className="rounded-xl border border-slate/20 px-3 py-2 text-sm"
              placeholder="Code NAF ou secteur (ex: 62.01Z, BTP...)"
              title="Saisissez un code NAF ou un secteur, puis cliquez sur Pre-remplir"
              value={sectorInput}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSectorInput(e.target.value)}
            />
            <button
              className="rounded-xl bg-ocean px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              onClick={() => prefillFromSector(sectorInput)}
              disabled={loadingHazards}
              title="Ajoute les risques generiques + ceux du secteur/NAF"
            >
              Pre-remplir risques (NAF/secteur)
            </button>
          </div>
          <select
            className="rounded-xl border border-slate/20 bg-white px-3 py-2 text-sm"
            value={filters.category}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilters((f) => ({ ...f, category: e.target.value }))}
            title="Filtrer par categorie de risque"
          >
            <option value="">Categorie</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-slate/20 bg-white px-3 py-2 text-sm"
            value={filters.priority || ""}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setFilters((f) => ({ ...f, priority: e.target.value ? (Number(e.target.value) as Priority) : undefined }))
            }
            title="Filtrer par priorite (P1 critique -> P4 surveiller)"
          >
            <option value="">Priorite</option>
            <option value="1">P1</option>
            <option value="2">P2</option>
            <option value="3">P3</option>
            <option value="4">P4</option>
          </select>
          <button
            className="rounded-xl border border-slate/20 bg-white px-3 py-2 text-sm"
            onClick={() => setPrioritySort((p) => (p === "asc" ? "desc" : "asc"))}
          >
            Tri priorité ({prioritySort === "asc" ? "P1->P4" : "P4->P1"})
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate/10 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate/10">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate/50">
                <th className="px-4 py-2 text-left">Risque</th>
                <th className="px-4 py-2 text-left">Priorité</th>
                <th className="px-4 py-2 text-left">Mesures</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate/10 text-sm">
              {groupedByCategory.map(([cat, items]) => (
                <tr key={cat} className="bg-slate/5 text-xs font-semibold uppercase tracking-wide text-slate/60">
                  <td className="px-4 py-2" colSpan={4}>
                    {cat}
                  </td>
                </tr>
              )).length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate/50" colSpan={4}>
                    Aucun risque identifié. Utilisez « Pré-remplir » ci-dessus pour générer automatiquement les risques de votre secteur.
                  </td>
                </tr>
              )}
              {groupedByCategory.map(([cat, items]) => (
                <Fragment key={cat}>
                  {items.map((a) => {
                    const hasMeasures = Boolean(a.existingMeasures?.trim() || a.proposedMeasures?.trim());
                    const isOpen = expandedId === a.id;
                    return (
                    <Fragment key={a.id}>
                      <tr
                        className="hover:bg-slate/5 transition cursor-pointer"
                        onClick={() => openQuestionnaire(a.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{a.riskLabel}</div>
                          <div className="text-xs text-slate/50">{cat}</div>
                        </td>
                        <td className="px-4 py-3">
                          <PriorityBadge priority={a.priority} />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              hasMeasures ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {hasMeasures ? "Mesures définies" : "À définir"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="text-ocean text-xs font-semibold hover:underline"
                            onClick={(e) => { e.stopPropagation(); openQuestionnaire(a.id); }}
                          >
                            {isOpen ? "Réduire ▲" : "Ajuster ▼"}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate/5">
                          <td className="px-4 py-4" colSpan={4}>
                            <div className="mb-4 grid gap-4 sm:grid-cols-2">
                              <div className="rounded-xl border border-slate/10 bg-white p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate/50 mb-2">
                                  Cotation (G × F / M)
                                </p>
                                {a.damages && <p className="text-xs text-slate/60 mb-3">{a.damages}</p>}
                                <div className="flex flex-wrap items-end gap-3">
                                  {(["gravity", "frequency", "control"] as const).map((field) => (
                                    <label key={field} className="text-xs text-slate/60">
                                      {field === "gravity" ? "Gravité" : field === "frequency" ? "Fréquence" : "Maîtrise"}
                                      <input
                                        type="number"
                                        className="mt-1 block w-16 rounded-lg border border-slate/20 px-2 py-1 text-sm"
                                        value={field === "gravity" ? a.gravity : field === "frequency" ? a.frequency : a.control}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => onChangeScore(a, field, Number(e.target.value))}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </label>
                                  ))}
                                  <div className="text-xs text-slate/60">
                                    Score
                                    <div className="mt-1 font-semibold text-slate-900">{a.score}</div>
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-xl border border-slate/10 bg-white p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate/50 mb-2">
                                  Mesures
                                </p>
                                <label className="block text-xs text-slate/60 mb-2">
                                  Existantes
                                  <textarea
                                    className="mt-1 w-full rounded-lg border border-slate/20 px-2 py-1 text-sm"
                                    rows={2}
                                    value={a.existingMeasures || ""}
                                    onChange={(e) => updateAssessment(a.id, { existingMeasures: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </label>
                                <label className="block text-xs text-slate/60">
                                  À proposer
                                  <textarea
                                    className="mt-1 w-full rounded-lg border border-slate/20 px-2 py-1 text-sm"
                                    rows={2}
                                    value={a.proposedMeasures || ""}
                                    onChange={(e) => updateAssessment(a.id, { proposedMeasures: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </label>
                              </div>
                            </div>
                            {(() => {
                              const ans = questAnswers[a.id] || { q1: "", q2: "", q3: "", q4: "" };
                              const setAns = (key: keyof QAnswers, val: string) => {
                                const next = { ...ans, [key]: val };
                                setQuestAnswers((prev) => ({ ...prev, [a.id]: next }));
                                applyQuestionnaire(a.id, next);
                              };
                              const allAnswered = ans.q1 && ans.q2 && ans.q3 && ans.q4;
                              const btnClass = (active: boolean) =>
                                `rounded-lg border px-3 py-1.5 text-xs transition ${
                                  active
                                    ? "border-ocean bg-ocean/10 text-ocean font-semibold"
                                    : "border-slate/20 bg-white text-slate-700 hover:border-slate/40"
                                }`;
                              const { q3: q3def, q4: q4def } = getQ3Q4(a.hazardCategory);
                              return (
                                <div className="space-y-4">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate/50">
                                    Questionnaire de pondération — {a.riskLabel}
                                  </p>

                                  {/* Q1 — Gravité */}
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800 mb-2">
                                      1. Quelle est la conséquence la plus grave probable ?
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {[
                                        { val: "gêne", label: "Gêne / premiers soins" },
                                        { val: "arrêt_court", label: "Arrêt < 8 jours" },
                                        { val: "arrêt_long", label: "Arrêt long / séquelles" },
                                        { val: "invalidité", label: "Invalidité / décès possible" },
                                      ].map((o) => (
                                        <button key={o.val} className={btnClass(ans.q1 === o.val)} onClick={() => setAns("q1", o.val)}>
                                          {o.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Q2 — Fréquence */}
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800 mb-2">
                                      2. À quelle fréquence les travailleurs sont-ils exposés ?
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {[
                                        { val: "rare", label: "Rarement (< 1×/mois)" },
                                        { val: "mensuel", label: "Quelques fois/mois" },
                                        { val: "hebdo", label: "Plusieurs fois/semaine" },
                                        { val: "quotidien", label: "Quotidiennement" },
                                      ].map((o) => (
                                        <button key={o.val} className={btnClass(ans.q2 === o.val)} onClick={() => setAns("q2", o.val)}>
                                          {o.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Q3 — contextualisé */}
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1">
                                      {q3def.question}
                                      {q3def.hint && (
                                        <span className="group relative inline-flex items-center cursor-help">
                                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate/20 text-slate/60 text-[10px] font-bold">?</span>
                                          <span className="pointer-events-none absolute left-5 top-0 z-50 w-72 rounded-lg border border-slate/20 bg-white p-2.5 text-xs text-slate/70 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                            {q3def.hint}
                                          </span>
                                        </span>
                                      )}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {q3def.options.map((o) => (
                                        <span key={o.val} className="group relative">
                                          <button className={`rounded-lg border px-3 py-1.5 text-xs transition ${ans.q3 === o.val ? "border-ocean bg-ocean/10 text-ocean font-semibold" : "border-slate/20 bg-white text-slate-700 hover:border-slate/40"}`} onClick={() => setAns("q3", o.val)}>
                                            {o.label}
                                          </button>
                                          {o.hint && (
                                            <span className="pointer-events-none absolute left-0 top-8 z-50 w-64 rounded-lg border border-slate/20 bg-white p-2.5 text-xs text-slate/70 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                              {o.hint}
                                            </span>
                                          )}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Q4 — contextualisé */}
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1">
                                      {q4def.question}
                                      {q4def.hint && (
                                        <span className="group relative inline-flex items-center cursor-help">
                                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate/20 text-slate/60 text-[10px] font-bold">?</span>
                                          <span className="pointer-events-none absolute left-5 top-0 z-50 w-72 rounded-lg border border-slate/20 bg-white p-2.5 text-xs text-slate/70 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                            {q4def.hint}
                                          </span>
                                        </span>
                                      )}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {q4def.options.map((o) => (
                                        <span key={o.val} className="group relative">
                                          <button className={`rounded-lg border px-3 py-1.5 text-xs transition ${ans.q4 === o.val ? "border-ocean bg-ocean/10 text-ocean font-semibold" : "border-slate/20 bg-white text-slate-700 hover:border-slate/40"}`} onClick={() => setAns("q4", o.val)}>
                                            {o.label}
                                          </button>
                                          {o.hint && (
                                            <span className="pointer-events-none absolute left-0 top-8 z-50 w-64 rounded-lg border border-slate/20 bg-white p-2.5 text-xs text-slate/70 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                              {o.hint}
                                            </span>
                                          )}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Résultat */}
                                  {allAnswered && (
                                    <div className="rounded-xl border border-ocean/20 bg-ocean/5 px-4 py-3 text-xs text-slate/70">
                                      Scores calculés — G : <strong>{Q1_MAP[ans.q1]}</strong> / F : <strong>{Q2_MAP[ans.q2]}</strong> / M : <strong>{Math.max(Q3_MAP[ans.q3] + Q4_MAP[ans.q4], 0.5)}</strong>
                                      {" "}→ Score : <strong className="text-ocean">{(Q1_MAP[ans.q1] * Q2_MAP[ans.q2] / Math.max(Q3_MAP[ans.q3] + Q4_MAP[ans.q4], 0.5)).toFixed(0)}</strong>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between">
                                    <button
                                      className="text-sunset text-xs hover:underline"
                                      onClick={() => { if (window.confirm(`Supprimer le risque "${a.riskLabel}" et toutes ses données ?`)) removeAssessment(a.id); }}
                                    >
                                      Supprimer ce risque
                                    </button>
                                    <button className="text-ocean text-xs underline" onClick={() => setExpandedId(null)}>
                                      Fermer
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {sorted.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-slate/10 bg-white px-4 py-2 text-sm shadow-sm">
          <span className="text-slate/60">
            {sorted.length} risque{sorted.length > 1 ? "s" : ""} — page {safePage + 1} / {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-slate/20 px-3 py-1 text-slate-700 hover:bg-slate/5 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
            >
              ← Précédent
            </button>
            <button
              className="rounded-lg border border-slate/20 px-3 py-1 text-slate-700 hover:bg-slate/5 disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
            >
              Suivant →
            </button>
          </div>
        </div>
      )}

      <Card
        title="Ajouter un risque depuis la bibliotheque"
        subtitle="Filtrer par categorie, choisir le risque, coter G/F/P et proposer des mesures"
      >
        <p className="text-xs text-slate/60">
          Sources : INRS (catalogue generique), OPPBTP / CARSAT / ANACT selon le secteur selectionne.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={newRiskMode}
              onChange={(e) => setNewRiskMode(e.target.checked)}
            />
            <span className="text-slate/80">Ajouter un nouveau risque</span>
          </label>
        </div>

        {!newRiskMode && (
          <>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <label className="text-sm">
                <span className="block text-slate/70">Catégorie</span>
                <select
                  className="mt-1 w-full rounded-xl border border-slate/20 bg-white px-3 py-2"
                  value={libraryCategory}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => onSelectLibraryCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="md:col-span-2 text-sm">
                <span className="block text-slate/70">Risque</span>
                <select
                  className="mt-1 w-full rounded-xl border border-slate/20 bg-white px-3 py-2"
                  value={form.hazardId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm((f) => ({ ...f, hazardId: e.target.value }))}
                >
                  {hazardsForCategory.length === 0 && <option value="">Aucun risque disponible</option>}
                  {hazardsForCategory.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.risk}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              {(["gravity", "frequency", "control"] as const).map((field) => (
                <label key={field} className="text-slate/70">
                  {field === "gravity" ? "G" : field === "frequency" ? "F" : "P"}
                  <input
                    type="number"
                    className="mt-1 w-full rounded-xl border border-slate/20 px-3 py-2"
                    value={form[field]}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: Number(e.target.value) }))}
                  />
                </label>
              ))}
            </div>
          </>
        )}

        {newRiskMode && (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="text-sm">
              <span className="block text-slate/70">ID (optionnel)</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate/20 px-3 py-2"
                placeholder="ex: haz-custom-01"
                value={newRisk.id}
                onChange={(e) => setNewRisk((r) => ({ ...r, id: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="block text-slate/70">Catégorie</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate/20 px-3 py-2"
                placeholder="ex: Ergonomie"
                value={newRisk.category}
                onChange={(e) => setNewRisk((r) => ({ ...r, category: e.target.value }))}
              />
            </label>
            <label className="text-sm md:col-span-1">
              <span className="block text-slate/70">Risque</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate/20 px-3 py-2"
                placeholder="Libellé du risque"
                value={newRisk.risk}
                onChange={(e) => setNewRisk((r) => ({ ...r, risk: e.target.value }))}
              />
            </label>
            <label className="text-sm md:col-span-3">
              <span className="block text-slate/70">Dommages / exemples</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate/20 px-3 py-2"
                placeholder="Ex: coupures, brûlures, inhalation..."
                value={newRisk.damages}
                onChange={(e) => setNewRisk((r) => ({ ...r, damages: e.target.value }))}
              />
            </label>
            <div className="grid grid-cols-3 gap-2 text-sm md:col-span-3">
              {(["gravity", "frequency", "control"] as const).map((field) => (
                <label key={field} className="text-slate/70">
                  {field === "gravity" ? "G" : field === "frequency" ? "F" : "P"}
                  <input
                    type="number"
                    className="mt-1 w-full rounded-xl border border-slate/20 px-3 py-2"
                    value={form[field]}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: Number(e.target.value) }))}
                  />
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="text-sm">
            <span className="block text-slate/70">Mesures existantes</span>
            <textarea
              className="mt-1 w-full rounded-xl border border-slate/20 bg-white px-3 py-2"
              rows={3}
              value={form.existingMeasures}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, existingMeasures: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="block text-slate/70">Mesures a proposer</span>
            <textarea
              className="mt-1 w-full rounded-xl border border-slate/20 bg-white px-3 py-2"
              rows={3}
              value={form.proposedMeasures}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, proposedMeasures: e.target.value }))}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            className="rounded-xl bg-ocean px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            onClick={addRisk}
            disabled={!newRiskMode && !form.hazardId}
          >
            Ajouter au DUERP
          </button>
          {addInfo && <span className="text-sm text-ocean">{addInfo}</span>}
          <button
            className="text-sm text-ocean hover:underline"
            onClick={() => navigate("/duerp-results")}
            title="Visualiser la synthese DUERP"
          >
            Voir la synthese DUERP
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Inventory;
