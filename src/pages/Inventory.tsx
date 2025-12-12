import { ChangeEvent, Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { PriorityBadge } from "../components/Badge";
import { AssistPanel } from "../components/AssistPanel";
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
  } = useDuerpStore();

  const currentEstablishment = establishments.find((e) => e.id === selectedEstablishmentId);
  const currentUnit = workUnits.find((u) => u.id === selectedWorkUnitId);
  const enableIaV2 = import.meta.env.VITE_DUERP_ENABLE_IA_V2 === "true";

  const [filters, setFilters] = useState<Filters>({ search: "", category: "" });
  const [prioritySort, setPrioritySort] = useState<"asc" | "desc">("asc");
  const [sectorInput, setSectorInput] = useState(currentEstablishment?.codeNaf || currentEstablishment?.sector || "");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newRiskMode, setNewRiskMode] = useState<boolean>(false);
  const [newRisk, setNewRisk] = useState({ id: "", category: "", risk: "", damages: "" });
  const [libraryCategory, setLibraryCategory] = useState<string>(hazardLibrary[0]?.category || "");
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [addInfo, setAddInfo] = useState<string>("");
  const [showAll, setShowAll] = useState<boolean>(false);
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

  const filteredMap = useMemo(() => new Map(filtered.map((a) => [a.id, a])), [filtered]);
  const sorted = expandedId === null
    ? filtered
    : orderIds
        .map((id) => filteredMap.get(id))
        .filter((v): v is Assessment => Boolean(v));

  const visibleLimit = useMemo(() => {
    if (showAll) return sorted.length;
    const activity = (currentUnit?.activity || "").toLowerCase();
    const rich = ["atelier", "chantier", "terrain", "logistique", "cuisine", "maintenance", "production"];
    return rich.some((k) => activity.includes(k)) ? 12 : 8;
  }, [currentUnit?.activity, showAll, sorted.length]);

  const visibleAssessments = sorted.slice(0, visibleLimit);
  const hiddenCount = Math.max(sorted.length - visibleAssessments.length, 0);

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, Assessment[]>();
    visibleAssessments.forEach((a) => {
      const key = a.hazardCategory || "Autres";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return Array.from(map.entries());
  }, [visibleAssessments]);

  const iaRisks = useMemo(
    () =>
      currentAssessments.map((a) => ({
        id: a.id,
        riskLabel: a.riskLabel,
        hazardCategory: a.hazardCategory,
        severity: a.gravity,
        frequency: a.frequency,
        mastery: a.control,
        context: a.existingMeasures,
      })),
    [currentAssessments]
  );

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

  const applyPreset = (assessment: Assessment, field: "gravity" | "frequency" | "control", value: number) => {
    updateAssessment(assessment.id, { [field]: value });
  };

  const presetOptions = [
    { label: "Faible", value: 4 },
    { label: "Moyen", value: 6 },
    { label: "Élevé", value: 8 },
  ];

  const guidance: Record<
    string,
    { severity: string[]; frequency: string[]; control: string[] }
  > = {
    "Chimique": {
      severity: ["Irritations ou brûlures légères", "Intoxication / brûlures chimiques", "CMR / brûlures graves"],
      frequency: ["Manipulation rare / petites quantités", "Usage hebdomadaire ou postes dédiés", "Usage quotidien / brouillard, vapeurs importantes"],
      control: ["Pas de captage / FDS absentes", "Ventilation générale, FDS accessibles", "Captage source, EPI adaptés, ventilation contrôlée"],
    },
    "Accident": {
      severity: ["Blessure légère sans arrêt", "Entorse / fracture simple", "Traumatisme grave / décès possible"],
      frequency: ["Situations exceptionnelles", "Situations hebdomadaires", "Situations quotidiennes"],
      control: ["Protections absentes", "Protections partielles", "Protections en place + contrôles"],
    },
    "Ergonomie": {
      severity: ["Gêne / fatigue", "TMS récurrents", "Risque de lésion sévère"],
      frequency: ["Gestes ponctuels", "Gestes réguliers", "Gestes répétitifs toute la journée"],
      control: ["Poste non réglé / aides absentes", "Réglages partiels ou aléatoires", "Postes réglables + alternance + aides"],
    },
    "Biologique": {
      severity: ["Contact faible, risque modéré", "Exposition à agents infectieux", "Agents à fort pouvoir pathogène"],
      frequency: ["Occasionnelle", "Hebdomadaire", "Quotidienne / soins fréquents"],
      control: ["Hygiène insuffisante", "Protocoles partiels", "Protocoles formalisés + EPI + suivi"],
    },
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

        <div className="mb-3 rounded-xl bg-slate/5 px-3 py-2 text-xs text-slate/70">
          Astuce : 1) Saisissez le code NAF/secteur puis "Pre-remplir" pour charger des risques proposés. 2) Ajustez G/F/P
          ou utilisez le "Questionnaire (pondération)" pour appliquer une pondération guidée. 3) Supprimez les risques non pertinents.
        </div>

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

        {enableIaV2 && (
          <div className="mt-4">
            <AssistPanel
              enabled={enableIaV2}
              nafCode={currentEstablishment?.codeNaf || undefined}
              unitName={currentUnit?.name}
              activity={currentUnit?.activity}
              risks={iaRisks}
            />
          </div>
        )}

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate/10 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate/10">
            <tbody className="divide-y divide-slate/10 text-sm">
              {groupedByCategory.map(([cat, items]) => (
                <tr key={cat} className="bg-slate/5 text-xs font-semibold uppercase tracking-wide text-slate/60">
                  <td className="px-4 py-2" colSpan={9}>
                    {cat}
                  </td>
                </tr>
              )).length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate/50" colSpan={9}>
                    Aucun risque. Pre-remplissez via le NAF/secteur ou ajoutez depuis la bibliothèque.
                  </td>
                </tr>
              )}
              {groupedByCategory.map(([cat, items]) => (
                <Fragment key={cat}>
                  {items.map((a) => (
                    <Fragment key={a.id}>
                      <tr className="hover:bg-slate/5 transition">
                        <td className="px-4 py-3 text-slate/70">{cat}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{a.riskLabel}</td>
                        <td className="px-4 py-3 text-slate/70">{a.damages}</td>
                        {(["gravity", "frequency", "control"] as const).map((field) => (
                          <td key={field} className="px-4 py-3">
                            <input
                              type="number"
                              className="w-16 rounded-lg border border-slate/20 px-2 py-1 text-sm"
                              value={field === "gravity" ? a.gravity : field === "frequency" ? a.frequency : a.control}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => onChangeScore(a, field, Number(e.target.value))}
                            />
                          </td>
                        ))}
                        <td className="px-4 py-3 font-semibold text-slate-900">{a.score}</td>
                        <td className="px-4 py-3">
                          <PriorityBadge priority={a.priority} />
                        </td>
                        <td className="px-4 py-3 text-xs text-slate/60">
                          <div>Existantes: {a.existingMeasures || "—"}</div>
                          <div className="mt-1">A proposer: {a.proposedMeasures || "—"}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button
                              className="text-ocean text-xs hover:underline"
                              onClick={() => setExpandedId((prev) => (prev === a.id ? null : a.id))}
                            >
                              Questionnaire (pondération)
                            </button>
                            <button className="text-sunset text-xs hover:underline" onClick={() => removeAssessment(a.id)}>
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === a.id && (
                        <tr className="bg-slate/5">
                          <td className="px-4 py-3 text-xs text-slate/70" colSpan={9}>
                            <div className="mb-2 font-semibold text-slate-800">Ajustement guidé (G/F/P)</div>
                            <div className="grid gap-2 md:grid-cols-3">
                              {(["gravity", "frequency", "control"] as const).map((field) => (
                                <label key={field} className="text-xs text-slate/70">
                                  {field === "gravity"
                                    ? "Sévérité potentielle"
                                    : field === "frequency"
                                    ? "Fréquence d'exposition"
                                    : "Maîtrise / protections"}
                                  <select
                                    className="mt-1 w-full rounded-lg border border-slate/20 bg-white px-2 py-1 text-sm"
                                    value={
                                      field === "gravity" ? a.gravity : field === "frequency" ? a.frequency : a.control
                                    }
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                      applyPreset(a, field, Number(e.target.value))
                                    }
                                  >
                                    {presetOptions.map((opt) => (
                                      <option key={opt.label} value={opt.value}>
                                        {opt.label} ({opt.value})
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ))}
                            </div>
                            {(() => {
                              const g =
                                guidance[a.hazardCategory] ||
                                guidance[a.hazardCategory?.split(" ")[0]] ||
                                {
                                  severity: ["Gêne légère", "Blessure ou arrêt possible", "Blessure grave / séquelles"],
                                  frequency: ["Rare", "Régulier", "Quotidien"],
                                  control: ["Peu de protections", "Protections partielles", "Protections efficaces et contrôlées"],
                                };
                              return (
                                <div className="mt-3 grid gap-2 md:grid-cols-3 text-xs text-slate/70">
                                  <div>
                                    <p className="font-semibold text-slate-800">Repères Sévérité</p>
                                    {g.severity.map((t, i) => (
                                      <p key={i}>{t}</p>
                                    ))}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-800">Repères Fréquence</p>
                                    {g.frequency.map((t, i) => (
                                      <p key={i}>{t}</p>
                                    ))}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-800">Repères Maîtrise</p>
                                    {g.control.map((t, i) => (
                                      <p key={i}>{t}</p>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                            <div className="mt-2 text-right">
                              <button
                                className="text-ocean text-xs underline"
                                onClick={() => setExpandedId(null)}
                              >
                                Fermer le questionnaire
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {hiddenCount > 0 && (
        <div className="rounded-lg bg-slate/5 px-3 py-2 text-xs text-slate/70">
          {hiddenCount} risques supplémentaires masqués (limite {visibleLimit}). Ajustez les filtres ou{" "}
          <button
            className="inline-flex items-center rounded-full border border-ocean px-2 py-1 text-ocean hover:bg-ocean/10"
            onClick={() => setShowAll(true)}
          >
            Afficher tout
          </button>
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
