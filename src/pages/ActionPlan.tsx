import { useMemo, useState } from "react";
import { Card } from "../components/Card";
import { PriorityBadge } from "../components/Badge";
import actionsCatalog from "../../config/actions.catalog.json";
import { useDuerpStore } from "../state/store";
import type { ActionStatus, Priority, Assessment, WorkUnit, ActionItem } from "../types";

type CatalogAction = {
  id: string;
  risk_id?: string;
  risk_label?: string;
  title: string;
  description?: string;
};

const STATUSES: ActionStatus[] = ["TO_DO", "IN_PROGRESS", "LATE", "DONE"];
const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

export const ActionPlan = () => {
  const {
    actions,
    assessments,
    workUnits,
    establishments,
    selectedEstablishmentId,
    setSelectedWorkUnit,
    addAction,
    removeAction,
    updateAction,
    updateActionStatus,
    toggleActionStep,
  } = useDuerpStore();

  const [filter, setFilter] = useState<ActionStatus | "">("");
  const [unitTab, setUnitTab] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    owner: "",
    how: "",
    startDate: "",
    dueDate: "",
    endDate: "",
    assessmentId: "",
    priority: 3 as Priority,
  });

  const workUnitById = useMemo(() => {
    const map = new Map<string, WorkUnit>();
    workUnits.forEach((w) => map.set(w.id, w));
    return map;
  }, [workUnits]);

  const assessmentById = useMemo(() => {
    const map = new Map<string, Assessment>();
    assessments.forEach((a) => map.set(a.id, a));
    return map;
  }, [assessments]);

  const effectiveStatus = (a: ActionItem) => {
    if (a.status === "DONE") return "DONE";
    const end = a.endDate ? new Date(a.endDate).getTime() : undefined;
    if (end !== undefined && end < Date.now()) return "LATE";
    return a.status;
  };

  const actionsWithEffectiveStatus = useMemo(
    () => actions.map((a) => ({ ...a, status: effectiveStatus(a) })),
    [actions]
  );

  const filteredByStatus = useMemo(
    () =>
      actionsWithEffectiveStatus
        .filter((a) => (selectedEstablishmentId ? a.establishmentId === selectedEstablishmentId : true))
        .filter((a) => (filter ? a.status === filter : true)),
    [actionsWithEffectiveStatus, selectedEstablishmentId, filter]
  );

  const filtered = useMemo(() => {
    if (unitTab === "all") return filteredByStatus;
    return filteredByStatus.filter((action) => {
      if (!action.assessmentId) return false;
      const assessment = assessments.find((a: Assessment) => a.id === action.assessmentId);
      return assessment?.workUnitId === unitTab;
    });
  }, [filteredByStatus, unitTab, assessments]);

  const linkedAssessments = useMemo(() => assessments, [assessments]);

  const normalize = (s: string) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const assessmentsByCategory = useMemo(() => {
    const map = new Map<string, Assessment[]>();
    linkedAssessments.forEach((a) => {
      const key = a.hazardCategory || "Autres";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return Array.from(map.entries()).map(([cat, list]) => ({
      category: cat,
      items: list.sort((a, b) => a.riskLabel.localeCompare(b.riskLabel)),
    }));
  }, [linkedAssessments]);

  const actionsByRisk = useMemo(() => {
    const map = new Map<string, CatalogAction[]>();
    (actionsCatalog as CatalogAction[]).forEach((a) => {
      if (!a.risk_id) return;
      const key = normalize(a.risk_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, []);

  const labelToRiskId: Record<string, string> = {
    "atmospheres explosives": "r-atex",
    "incendie et evacuation": "r-incendie",
    "chutes de plain pied et de hauteur": "r-chute-hauteur",
    "machines et equipements de travail": "r-machine",
    "risque electrique": "r-electrique",
    "risque routier professionnel": "r-routier",
    "bruit": "r-bruit",
    "vibrations": "r-vibrations",
    "tms": "r-tms",
    "risques psychosociaux": "r-rps",
    "risques psychosociaux rps": "r-rps",
    "travail sur ecran": "r-ecran",
    "horaires atypiques travail de nuit": "r-night",
    "travail de nuit equipes alternantes": "r-night",
    "manutention manuelle": "r-manutention",
    "manutentions manuelles et tms": "r-manutention",
    "manutention manuelle et tms": "r-manutention",
    "agents chimiques dangereux": "r-chimique",
    "biologique": "r-bio",
    "glissades": "r-glissades",
    "travail de nuit": "r-night"
  };

  const categoryToRiskId: Record<string, string> = {
    "manutention manuelle": "r-manutention",
    "ergonomie": "r-tms",
    "organisation": "r-rps",
    "travail sur ecran": "r-ecran",
    "bruit": "r-bruit",
    "vibrations": "r-vibrations",
    "risques psychosociaux": "r-rps",
    "travail de nuit": "r-night",
  };

  const getCatalogForAssessment = (assessment?: Assessment) => {
    if (!assessment) return undefined;
    const riskId = assessment.hazardId ? normalize(assessment.hazardId) : "";
    const riskLabel = normalize(assessment.riskLabel || "");
    const riskCategory = normalize(assessment.hazardCategory || "");

    // 1) match by hazardId/risk_id exact
    const byId = riskId ? actionsByRisk.get(riskId) : undefined;
    if (byId?.length) return byId;

    // 2) match using label alias
    const aliasId = labelToRiskId[riskLabel];
    const byAlias = aliasId ? actionsByRisk.get(normalize(aliasId)) : undefined;
    if (byAlias?.length) return byAlias;

    // 3) match using category alias
    const catId = categoryToRiskId[riskCategory];
    const byCat = catId ? actionsByRisk.get(normalize(catId)) : undefined;
    if (byCat?.length) return byCat;

    // 4) last resort: find risk_id containing label
    const all = actionsCatalog as CatalogAction[];
    const matches = all.filter((a) => {
      const rid = normalize(a.risk_id || "");
      return rid === riskLabel || rid.includes(riskLabel) || riskLabel.includes(rid);
    });
    return matches.length ? matches : undefined;
  };

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { unitId?: string; unitLabel: string; headcount?: number; items: typeof filtered }
    >();
    filtered.forEach((action) => {
      const assessment = action.assessmentId ? assessmentById.get(action.assessmentId) : undefined;
      const unit = assessment ? workUnitById.get(assessment.workUnitId) : undefined;
      const unitLabel = unit?.name || "Unité non renseignée";
      if (!map.has(unitLabel)) {
        map.set(unitLabel, { unitId: unit?.id, unitLabel, headcount: unit?.headcount, items: [] });
      }
      map.get(unitLabel)!.items.push(action);
    });
    return Array.from(map.values()).sort((a, b) => a.unitLabel.localeCompare(b.unitLabel));
  }, [filtered, assessments, workUnitById]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const done = filtered.filter((a) => a.status === "DONE").length;
    const overdue = filtered.filter(
      (a) => a.status !== "DONE" && a.dueDate && new Date(a.dueDate) < new Date()
    ).length;
    const progress = total ? Math.round((done * 100) / total) : 0;
    return { total, done, overdue, progress };
  }, [filtered]);

  const formatActionTitle = (actionTitle: string | undefined, linked?: Assessment) => {
    const base = actionTitle?.trim() || "";
    const baseLower = base.toLowerCase();
    const generic =
      base === "" ||
      baseLower.startsWith("action prioritaire") ||
      baseLower.startsWith("mettre en oeuvre les mesures pour");
    if (!linked) return base || "Définir une action";

    const catalog = getCatalogForAssessment(linked);
    const catalogTitle = catalog?.[0]?.title;

    if (generic && catalogTitle) return catalogTitle;
    if (generic) return `Mettre en œuvre les mesures pour ${linked.riskLabel}`;
    return base || "Définir une action";
  };

  const formatActionDescription = (actionDescription: string | undefined, linked?: Assessment) => {
    const base = actionDescription?.trim() || "";
    if (base) return base;
    const catalog = getCatalogForAssessment(linked);
    const desc = catalog?.find((c) => c.description)?.description || catalog?.[0]?.description;
    if (desc) return desc;
    return "Ajoutez la description et les étapes clés de l’action";
  };

  const onAdd = () => {
    if (!form.title || !form.startDate || !form.endDate) return;

    const linkedAssessment = form.assessmentId ? assessments.find((a) => a.id === form.assessmentId) : undefined;
    const linkedUnit = linkedAssessment ? workUnits.find((u) => u.id === linkedAssessment.workUnitId) : undefined;
    const targetEstablishmentId =
      selectedEstablishmentId ||
      linkedUnit?.establishmentId ||
      workUnits[0]?.establishmentId ||
      establishments[0]?.id;

    if (!targetEstablishmentId) return;

    const startDateIso = form.startDate ? new Date(form.startDate).toISOString() : undefined;
    const endDateIso = form.endDate ? new Date(form.endDate).toISOString() : undefined;
    const dueDateIso = form.dueDate
      ? new Date(form.dueDate).toISOString()
      : endDateIso;

    addAction({
      establishmentId: targetEstablishmentId,
      assessmentId: form.assessmentId || undefined,
      title: form.title,
      description: form.description,
      owner: form.owner,
      how: form.how,
      startDate: startDateIso,
      dueDate: dueDateIso,
      endDate: endDateIso,
      status: "TO_DO",
      priority: form.priority,
    });
    setForm({ title: "", description: "", owner: "", how: "", startDate: "", dueDate: "", endDate: "", assessmentId: "", priority: 3 });
  };

  return (
    <div className="space-y-5">
      <Card
        title="Plan d'action"
        subtitle="Actions regroupées par unité et priorisées"
        corner={
          <select
            className="rounded-xl border border-slate/20 bg-white px-3 py-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as ActionStatus | "")}
          >
            <option value="">Tous les statuts</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <button
            className={`rounded-full border px-3 py-1 ${
              unitTab === "all"
                ? "border-ocean bg-ocean/10 text-ocean font-semibold"
                : "border-slate/20 bg-white text-slate-700 hover:border-slate/40"
            }`}
            onClick={() => setUnitTab("all")}
          >
            Toutes les unités
          </button>
          {workUnits
            .filter((u) => !selectedEstablishmentId || u.establishmentId === selectedEstablishmentId)
            .map((u) => (
              <button
                key={u.id}
                className={`rounded-full border px-3 py-1 ${
                  unitTab === u.id
                    ? "border-ocean bg-ocean/10 text-ocean font-semibold"
                    : "border-slate/20 bg-white text-slate-700 hover:border-slate/40"
                }`}
                onClick={() => {
                  setUnitTab(u.id);
                  setSelectedWorkUnit(u.id);
                }}
              >
                {u.name} {u.headcount ? `(${u.headcount} pers.)` : ""}
              </button>
            ))}
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-slate/5 px-3 py-2 text-sm">
            <p className="text-xs uppercase text-slate/60">Total</p>
            <p className="text-xl font-semibold text-slate">{stats.total}</p>
          </div>
          <div className="rounded-xl bg-slate/5 px-3 py-2 text-sm">
            <p className="text-xs uppercase text-slate/60">Terminées</p>
            <p className="text-xl font-semibold text-slate">{stats.done}</p>
          </div>
          <div className="rounded-xl bg-slate/5 px-3 py-2 text-sm">
            <p className="text-xs uppercase text-slate/60">En retard</p>
            <p className="text-xl font-semibold text-sunset">{stats.overdue}</p>
          </div>
          <div className="rounded-xl bg-slate/5 px-3 py-2 text-sm">
            <p className="text-xs uppercase text-slate/60">Avancement</p>
            <p className="text-xl font-semibold text-ink">{stats.progress}%</p>
          </div>
        </div>

        <div className="space-y-4">
          {grouped.map((group) => (
            <div
              key={group.unitLabel}
              className="rounded-2xl border border-slate/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate">{group.unitLabel}</p>
                  {typeof group.headcount === "number" && (
                    <p className="text-xs text-slate/60">{group.headcount} pers.</p>
                  )}
                </div>
                <p className="text-xs text-slate/60">
                  {group.items.length} action{group.items.length > 1 ? "s" : ""}
                </p>
              </div>

              <div className="space-y-3">
                {group.items.map((a) => {
                  const linked = a.assessmentId ? assessmentById.get(a.assessmentId) : undefined;
                  return (
                    <div
                      key={a.id}
                      className="rounded-xl border border-slate/10 bg-slate/5 p-3"
                    >
                      <div className="grid gap-3 md:grid-cols-[1.3fr,1.3fr,1.3fr,auto] items-start">
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold text-slate">
                            {linked?.riskLabel || "Risque non renseigné"}
                          </p>
                          {linked?.hazardCategory && (
                            <p className="text-xs text-slate/60">
                              {linked.hazardCategory}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-slate/70">
                          {linked?.damages ? (
                            <p>{linked.damages}</p>
                          ) : (
                            <p className="text-slate/50">Détail du risque indisponible</p>
                          )}
                        </div>

                        <div className="space-y-1 text-sm">
                          <p className="font-semibold text-slate">
                            {formatActionTitle(a.title, linked)}
                          </p>
                          <p className="text-slate/60">
                            {formatActionDescription(a.description, linked)}
                          </p>
                          {a.how && (
                            <p className="text-xs text-slate/70">Comment : {a.how}</p>
                          )}
                        </div>

                        <div className="text-right space-y-1.5 min-w-[140px]">
                          <div className="flex items-center justify-end gap-2">
                            <PriorityBadge priority={a.priority} />
                          </div>
                          <select
                            className="rounded-xl border border-slate/20 bg-slate/5 px-2 py-1 text-xs w-full"
                            value={a.status}
                            onChange={(e) => updateActionStatus(a.id, e.target.value as ActionStatus)}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s === "TO_DO" ? "À faire" : s === "IN_PROGRESS" ? "En cours" : s === "LATE" ? "En retard" : "Terminé"}
                              </option>
                            ))}
                          </select>
                          {a.owner && (
                            <p className="text-xs text-slate/70 font-medium truncate" title={a.owner}>
                              👤 {a.owner}
                            </p>
                          )}
                          {(a.dueDate || a.endDate) && (
                            <p className={`text-xs font-medium ${
                              a.status !== "DONE" && (a.dueDate || a.endDate) && new Date(a.dueDate || a.endDate!) < new Date()
                                ? "text-red-600"
                                : "text-slate/60"
                            }`}>
                              📅 {formatDate(a.dueDate || a.endDate)}
                            </p>
                          )}
                          <div className="flex items-center justify-end gap-3">
                            <button
                              className="text-xs text-ocean underline"
                              onClick={() => setExpanded((prev) => (prev === a.id ? null : a.id))}
                            >
                              {expanded === a.id ? "Masquer" : "Modifier"}
                            </button>
                            <button
                              className="text-xs text-red-500 underline"
                              onClick={() => { if (window.confirm(`Supprimer l'action "${a.title || formatActionTitle(a.title, a.assessmentId ? assessmentById.get(a.assessmentId) : undefined)}" ?`)) removeAction(a.id); }}
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>

                      {expanded === a.id && (
                        <div className="mt-3 rounded-xl border border-slate/10 bg-white p-3 text-sm text-slate/80">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <p className="font-semibold text-slate">Quand ?</p>
                              <label className="block text-xs text-slate/60">
                                Début (JJ/MM/AA)
                                <input
                                  type="date"
                                  className="mt-1 w-full rounded-lg border border-slate/20 px-2 py-1 text-sm"
                                  value={a.startDate ? a.startDate.slice(0, 10) : ""}
                                  onChange={(e) => {
                                    const newStart = e.target.value;
                                    const end = a.endDate ? a.endDate.slice(0, 10) : "";
                                    if (end && newStart > end) {
                                      updateAction(a.id, { startDate: newStart, endDate: newStart });
                                    } else {
                                      updateAction(a.id, { startDate: newStart });
                                    }
                                  }}
                                />
                              </label>
                              <label className="block text-xs text-slate/60">
                                Fin (JJ/MM/AA)
                                <input
                                  type="date"
                                  className="mt-1 w-full rounded-lg border border-slate/20 px-2 py-1 text-sm"
                                  value={a.endDate ? a.endDate.slice(0, 10) : ""}
                                  min={a.startDate ? a.startDate.slice(0, 10) : undefined}
                                  onChange={(e) => {
                                    const newEnd = e.target.value;
                                    const start = a.startDate ? a.startDate.slice(0, 10) : "";
                                    if (start && newEnd < start) return;
                                    updateAction(a.id, { endDate: newEnd });
                                  }}
                                />
                              </label>
                            </div>
                            <div className="space-y-2">
                              <label className="block text-xs text-slate/60">
                                Qui ? (optionnel)
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate/20 px-2 py-1 text-sm"
                                  placeholder="Nom, équipe..."
                                  value={a.owner || ""}
                                  onChange={(e) => updateAction(a.id, { owner: e.target.value })}
                                />
                              </label>
                              <label className="block text-xs text-slate/60">
                                Comment ? (optionnel)
                                <textarea
                                  className="mt-1 w-full rounded-lg border border-slate/20 px-2 py-1 text-sm"
                                  placeholder="Approche, étapes clés"
                                  value={a.how || ""}
                                  onChange={(e) => updateAction(a.id, { how: e.target.value })}
                                />
                              </label>
                              <p className="text-xs text-slate/60">Priorité: P{a.priority}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="text-sm text-slate/70">Aucune action pour ce filtre.</p>
          )}
        </div>
      </Card>

      <Card title="Proposer une action" subtitle="Aligner les actions sur la priorité du risque">
        <p className="mb-2 text-xs text-slate/60">
          Début/Fin obligatoires (format JJ/MM/AA via le calendrier) : alimentent la roadmap Gantt par unité. Qui ? et Comment ? sont facultatifs.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-xl border border-slate/20 px-3 py-2"
            placeholder="Titre"
            value={form.title}
            onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))}
          />
          <select
            className="rounded-xl border border-slate/20 bg-white px-3 py-2"
            value={form.assessmentId}
            onChange={(e) => setForm((v) => ({ ...v, assessmentId: e.target.value }))}
          >
            <option value="">Risque lié (optionnel)</option>
            {assessmentsByCategory.map((group) => (
              <optgroup key={group.category} label={group.category}>
                {group.items.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.riskLabel} {a.damages ? `— ${a.damages}` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <input
            className="rounded-xl border border-slate/20 px-3 py-2"
            placeholder="Responsable"
            value={form.owner}
            onChange={(e) => setForm((v) => ({ ...v, owner: e.target.value }))}
          />
          <input
            className="rounded-xl border border-slate/20 px-3 py-2"
            placeholder="Date de début"
            type="date"
            value={form.startDate}
            onChange={(e) => {
              const newStart = e.target.value;
              setForm((v) => ({
                ...v,
                startDate: newStart,
                endDate: v.endDate && v.endDate < newStart ? newStart : v.endDate,
              }));
            }}
            title="Format JJ/MM/AA"
          />
          <input
            type="date"
            className="rounded-xl border border-slate/20 px-3 py-2"
            value={form.endDate}
            min={form.startDate || undefined}
            onChange={(e) => {
              const newEnd = e.target.value;
              if (form.startDate && newEnd < form.startDate) return;
              setForm((v) => ({ ...v, endDate: newEnd }));
            }}
            title="Format JJ/MM/AA"
          />
          <textarea
            className="md:col-span-2 rounded-xl border border-slate/20 px-3 py-2"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))}
          />
          <textarea
            className="md:col-span-2 rounded-xl border border-slate/20 px-3 py-2"
            placeholder="Comment (approche, étapes clés)"
            value={form.how}
            onChange={(e) => setForm((v) => ({ ...v, how: e.target.value }))}
          />
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate/70">Priorité</label>
            <select
              className="rounded-xl border border-slate/20 bg-white px-3 py-2"
              value={form.priority}
              onChange={(e) => setForm((v) => ({ ...v, priority: Number(e.target.value) as Priority }))}
            >
              <option value={1}>P1</option>
              <option value={2}>P2</option>
              <option value={3}>P3</option>
              <option value={4}>P4</option>
            </select>
          </div>
        </div>
        <button
          onClick={onAdd}
          className="mt-4 rounded-2xl bg-ink px-6 py-3 text-sm font-semibold text-white shadow-lg"
          disabled={!form.title || !form.startDate || !form.endDate}
        >
          Ajouter l'action
        </button>
      </Card>
    </div>
  );
};

export default ActionPlan;
