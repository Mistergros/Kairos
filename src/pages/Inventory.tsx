import { useEffect, useMemo, useState, Fragment, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { PriorityBadge } from "../components/Badge";
import { useDuerpStore } from "../state/store";
import { Assessment, Priority } from "../types";
import { getQuestionsForCategory, ScoringQuestion } from "../data/scoringQuestions";
import { getNafHints } from "../data/nafMappingLoader";

type Filters = {
  search: string;
  category: string;
  priority?: Priority;
};

export const Inventory = () => {
  const navigate = useNavigate();
  const {
    assessments,
    selectedWorkUnitId,
    addAssessment,
    updateAssessment,
    removeAssessment,
    hazardLibrary,
    prefillFromSector,
    loadingHazards,
    establishments,
    selectedEstablishmentId,
  } = useDuerpStore();

  const currentEstablishment = establishments.find((e) => e.id === selectedEstablishmentId);
  const [filters, setFilters] = useState<Filters>({ search: "", category: "" });
  const [form, setForm] = useState({
    hazardId: hazardLibrary[0]?.id || "",
    gravity: 7,
    frequency: 5,
    control: 1,
    existingMeasures: "",
    proposedMeasures: "",
  });
  const [sectorInput, setSectorInput] = useState(currentEstablishment?.codeNaf || currentEstablishment?.sector || "");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, Record<string, string>>>({});
  const nafHints = useMemo(() => getNafHints(currentEstablishment?.codeNaf || sectorInput), [currentEstablishment?.codeNaf, sectorInput]);

  useEffect(() => {
    setSectorInput(currentEstablishment?.codeNaf || currentEstablishment?.sector || "");
  }, [currentEstablishment?.sector, currentEstablishment?.codeNaf]);

  useEffect(() => {
    if (hazardLibrary.length && !form.hazardId) {
      setForm((f) => ({ ...f, hazardId: hazardLibrary[0].id }));
    }
  }, [hazardLibrary, form.hazardId]);

  const categories = Array.from(new Set(hazardLibrary.map((h) => h.category)));

  const filtered = useMemo(() => {
    const current = assessments.filter((a) => !selectedWorkUnitId || a.workUnitId === selectedWorkUnitId);
    return current
      .filter((a) => (filters.category ? a.hazardCategory === filters.category : true))
      .filter((a) => (filters.priority ? a.priority === filters.priority : true))
      .filter((a) =>
        filters.search
          ? `${a.riskLabel} ${a.hazardCategory}`.toLowerCase().includes(filters.search.toLowerCase())
          : true
      );
  }, [assessments, selectedWorkUnitId, filters]);

  const addRisk = () => {
    if (!selectedWorkUnitId || !form.hazardId) return;
    addAssessment({
      ...form,
      workUnitId: selectedWorkUnitId,
    });
    setForm((v) => ({ ...v, existingMeasures: "", proposedMeasures: "" }));
  };

  const onChangeScore = (assessment: Assessment, field: "gravity" | "frequency" | "control", value: number) => {
    updateAssessment(assessment.id, { [field]: value });
  };

  const applyQuestion = (assessment: Assessment, question: ScoringQuestion, value: string) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    updateAssessment(assessment.id, { [question.field]: numeric });
    setQuestionAnswers((prev) => ({
      ...prev,
      [assessment.id]: { ...(prev[assessment.id] || {}), [question.id]: value },
    }));
  };

  return (
    <div className="space-y-5">
      <Card
        title="Inventaire des risques"
        subtitle="Grille des risques, cotations et priorisation"
        corner={
          <div className="flex items-center gap-2">
            <input
              className="rounded-xl border border-slate/20 px-3 py-2 text-sm"
              placeholder="Recherche..."
              title="Filtrer par texte (risque ou categorie)"
              value={filters.search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
            <button
              type="button"
              className="rounded-xl bg-ocean px-3 py-2 text-xs font-semibold text-white shadow-sm"
              onClick={() => navigate("/duerp-results")}
              title="Ouvrir le calcul moteur V3 (risques/actions/obligations)"
            >
              Calculer DUERP (V3)
            </button>
          </div>
        }
      >
        <div className="mb-3 rounded-xl bg-slate/5 px-3 py-2 text-xs text-slate/70">
          📌 Astuce : 1) Saisissez le code NAF/secteur puis "Pre-remplir" pour charger des risques proposes. 2) Ajustez G/F/P
          ou utilisez le "Questionnaire (ponderation)" pour appliquer une ponderation guidee. 3) Supprimez les risques
          non pertinents.
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
              disabled={!sectorInput || loadingHazards}
              title="Ajoute les risques generiques + ceux du secteur/NAF"
            >
              {loadingHazards ? "Chargement..." : "Pre-remplir risques (NAF/secteur)"}
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
            value={filters.priority ?? ""}
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
          <span className="pill bg-slate/10 text-slate-700">{filtered.length} risques</span>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate/10 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate/10">
            <thead className="bg-slate/5 text-left text-xs font-semibold uppercase tracking-wide text-slate/60">
              <tr>
                <th className="px-4 py-3">Categorie</th>
                <th className="px-4 py-3">Risque</th>
                <th className="px-4 py-3">Dommages</th>
                <th className="px-4 py-3">G</th>
                <th className="px-4 py-3">F</th>
                <th className="px-4 py-3">P</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Priorite</th>
                <th className="px-4 py-3">Mesures</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate/10 text-sm">
              {filtered.map((a) => {
                const questions = getQuestionsForCategory(a.hazardCategory);
                const selected = questionAnswers[a.id] || {};
                const open = expandedRow === a.id;
                return (
                  <Fragment key={a.id}>
                    <tr className="hover:bg-slate/5">
                      <td className="px-4 py-3 text-slate/80">{a.hazardCategory}</td>
                      <td className="px-4 py-3 font-semibold text-slate">{a.riskLabel}</td>
                      <td className="px-4 py-3 text-slate/70">{a.damages}</td>
                      {(["gravity", "frequency", "control"] as const).map((field) => (
                        <td key={field} className="px-4 py-3">
                          <input
                            type="number"
                            className="w-16 rounded-lg border border-slate/20 px-2 py-1 text-sm"
                            value={a[field]}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => onChangeScore(a, field, Number(e.target.value))}
                            title={field === "gravity" ? "Gravite" : field === "frequency" ? "Frequence" : "Maitrise/Protections"}
                          />
                        </td>
                      ))}
                      <td className="px-4 py-3 font-semibold text-ink">{Math.round(a.score)}</td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={a.priority} />
                      </td>
                      <td className="px-4 py-3 max-w-sm space-y-2">
                        <p className="text-xs text-slate/70">Existantes: {a.existingMeasures || "—"}</p>
                        <p className="text-xs text-slate/70">A proposer: {a.proposedMeasures || "—"}</p>
                        <div className="flex flex-wrap gap-3 text-xs">
                          <button
                            type="button"
                            className="font-semibold text-ocean hover:underline"
                            onClick={() => setExpandedRow(open ? null : a.id)}
                            title="Ouvrir le mini-questionnaire pour ajuster G/F/P"
                          >
                            {open ? "Masquer le questionnaire" : "Questionnaire (ponderation)"}
                          </button>
                          <button
                            type="button"
                            className="text-sunset hover:underline"
                            onClick={() => removeAssessment(a.id)}
                            title="Supprimer ce risque de l inventaire"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-slate/5">
                        <td className="px-4 py-3" colSpan={9}>
                          <div className="space-y-2">
                            <p className="text-xs text-slate/60">
                              Repondez pour ajuster G / F / P : les valeurs sont appliquees directement au risque.
                            </p>
                            <div className="grid gap-3 md:grid-cols-3">
                              {questions.map((q) => (
                                <label key={q.id} className="space-y-1 text-sm text-slate/70">
                                  <span className="block font-semibold text-slate">
                                    {q.label}
                                    <span className="ml-2 rounded-full bg-slate/10 px-2 py-0.5 text-[11px] uppercase">
                                      {q.field === "gravity" ? "G" : q.field === "frequency" ? "F" : "P"}
                                    </span>
                                  </span>
                                  {q.helper && <span className="block text-xs text-slate/60">{q.helper}</span>}
                                  <select
                                    className="w-full rounded-lg border border-slate/20 bg-white px-3 py-2 text-sm"
                                    value={selected[q.id] ?? ""}
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => applyQuestion(a, q, e.target.value)}
                                  >
                                    <option value="">Choisir une option</option>
                                    {q.options.map((opt) => (
                                      <option key={opt.label} value={opt.value}>
                                        {opt.label} {opt.helper ? `(${opt.helper})` : ""}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ))}
                            </div>
                            {nafHints.length > 0 && (
                              <div className="rounded-xl bg-white/60 p-3 text-xs text-slate/70">
                                <p className="font-semibold text-slate mb-1">Pistes NAF {sectorInput || currentEstablishment?.codeNaf}</p>
                                <div className="grid gap-2 md:grid-cols-2">
                                  {nafHints.slice(0, 6).map((hint) => (
                                    <div key={`${hint.category}-${hint.label}`} className="space-y-1">
                                      <p className="text-slate font-semibold text-sm">{hint.label}</p>
                                      <ul className="list-disc space-y-0.5 pl-4">
                                        {hint.items.slice(0, 4).map((item) => (
                                          <li key={item}>{item}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Ajouter un risque depuis la bibliotheque"
        subtitle="Filtrer par categorie, choisir le risque, coter G/F/P et proposer des mesures"
      >
        <p className="text-xs text-slate/60">
          Sources : INRS (catalogue generique), OPPBTP / CARSAT / ANACT selon le secteur selectionne.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="md:col-span-2 text-sm">
            <span className="block text-slate/70">Risque</span>
            <select
              className="mt-1 w-full rounded-xl border border-slate/20 bg-white px-3 py-2"
              value={form.hazardId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm((f) => ({ ...f, hazardId: e.target.value }))}
            >
              {categories.map((c) => (
                <optgroup key={c} label={c}>
                  {hazardLibrary
                    .filter((h) => h.category === c)
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.risk}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {(["gravity", "frequency", "control"] as const).map((field) => (
              <label key={field} className="text-slate/70">
                {field === "gravity" ? "G" : field === "frequency" ? "F" : "P"}
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border border-slate/20 px-3 py-2"
                  value={form[field]}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: Number(e.target.value) }))}
                  title={field === "gravity" ? "Gravite" : field === "frequency" ? "Frequence" : "Maitrise/Protections"}
                />
              </label>
            ))}
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <textarea
            className="rounded-xl border border-slate/20 px-3 py-2"
            placeholder="Mesures existantes"
            value={form.existingMeasures}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, existingMeasures: e.target.value }))}
          />
          <textarea
            className="rounded-xl border border-slate/20 px-3 py-2"
            placeholder="Mesures a proposer"
            value={form.proposedMeasures}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, proposedMeasures: e.target.value }))}
          />
        </div>
        <button
          onClick={addRisk}
          className="mt-4 rounded-2xl bg-gradient-to-r from-ocean to-ink px-6 py-3 text-sm font-semibold text-white shadow-lg"
        >
          Ajouter au DUERP
        </button>
      </Card>
    </div>
  );
};

// Compatibilité import par défaut
export default Inventory;
