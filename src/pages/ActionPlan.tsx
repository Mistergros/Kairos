import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { usePlan } from "../hooks/usePlan";
import { Card } from "../components/Card";
import { PriorityBadge } from "../components/Badge";
import tasksCatalog from "../../config/tasks.catalog.json";
import { useDuerpStore } from "../state/store";
import { getCatalogActionsForAssessment, labelToRiskId, categoryToRiskId, normalize } from "../services/actionCatalogService";
import type { ActionStatus, Priority, Assessment, WorkUnit, ActionItem } from "../types";

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

  const plan = usePlan();
  const [filter, setFilter] = useState<ActionStatus | "">("");
  const [unitTab, setUnitTab] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"unit" | "owner">("owner");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newStepText, setNewStepText] = useState<Record<string, string>>({});
  const [localDates, setLocalDates] = useState<Record<string, { start?: string; end?: string }>>({});
  const getLocalDate = (id: string, field: "start" | "end", fallback?: string) =>
    localDates[id]?.[field] ?? (fallback ? fallback.slice(0, 10) : "");
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

  const tasksByRiskId = useMemo(() => {
    const map = new Map<string, string[]>();
    (tasksCatalog as { risk_id: string; tasks: string[] }[]).forEach((entry) => {
      map.set(normalize(entry.risk_id), entry.tasks);
    });
    return map;
  }, []);

  const getTasksForAssessment = (assessment?: Assessment): string[] => {
    if (!assessment) return [];
    const riskId = normalize(assessment.hazardId || "");
    const riskLabel = normalize(assessment.riskLabel || "");
    const riskCategory = normalize(assessment.hazardCategory || "");

    const byId = riskId ? tasksByRiskId.get(riskId) : undefined;
    if (byId?.length) return byId;

    const aliasId = labelToRiskId[riskLabel];
    const byAlias = aliasId ? tasksByRiskId.get(normalize(aliasId)) : undefined;
    if (byAlias?.length) return byAlias;

    const catId = categoryToRiskId[riskCategory];
    const byCat = catId ? tasksByRiskId.get(normalize(catId)) : undefined;
    if (byCat?.length) return byCat;

    return [];
  };

  const getCatalogForAssessment = (assessment?: Assessment) => {
    const matches = getCatalogActionsForAssessment(assessment);
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

  const groupedByUnitThenRisk = useMemo(() => {
    const unitMap = new Map<
      string,
      { unitId?: string; unitLabel: string; riskMap: Map<string, { riskLabel: string; items: typeof filtered }> }
    >();
    filtered.forEach((action) => {
      const assessment = action.assessmentId ? assessmentById.get(action.assessmentId) : undefined;
      const unit = assessment ? workUnitById.get(assessment.workUnitId) : undefined;
      const unitLabel = unit?.name || "Unité non renseignée";
      if (!unitMap.has(unitLabel)) {
        unitMap.set(unitLabel, { unitId: unit?.id, unitLabel, riskMap: new Map() });
      }
      const unitEntry = unitMap.get(unitLabel)!;
      const riskLabel = assessment?.riskLabel || "Risque non renseigné";
      if (!unitEntry.riskMap.has(riskLabel)) unitEntry.riskMap.set(riskLabel, { riskLabel, items: [] });
      unitEntry.riskMap.get(riskLabel)!.items.push(action);
    });
    return Array.from(unitMap.values())
      .map((u) => ({
        unitId: u.unitId,
        unitLabel: u.unitLabel,
        risks: Array.from(u.riskMap.values()).sort((a, b) => a.riskLabel.localeCompare(b.riskLabel, "fr")),
      }))
      .sort((a, b) => a.unitLabel.localeCompare(b.unitLabel, "fr"));
  }, [filtered, assessmentById, workUnitById]);

  const groupedByOwner = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((action) => {
      const owner = action.owner?.trim() || "À affecter";
      if (!map.has(owner)) map.set(owner, []);
      map.get(owner)!.push(action);
    });
    // Sort: named owners first alphabetically, "À affecter" last
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === "À affecter") return 1;
        if (b === "À affecter") return -1;
        return a.localeCompare(b, "fr");
      })
      .map(([owner, items]) => ({ owner, items }));
  }, [filtered]);

  const exportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const statusLabel = (s: string) =>
      s === "TO_DO" ? "À faire" : s === "IN_PROGRESS" ? "En cours" : s === "LATE" ? "En retard" : "Terminé";
    const priorityLabel = (p?: number) => p ? `P${p}` : "—";

    const buildRows = (items: typeof filtered) =>
      items
        .sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9))
        .map((a) => {
          const linked = a.assessmentId ? assessmentById.get(a.assessmentId) : undefined;
          const unit = linked ? workUnitById.get(linked.workUnitId) : undefined;
          return {
            Responsable: a.owner?.trim() || "À affecter",
            "Unité de travail": unit?.name || "—",
            Risque: linked?.riskLabel || "—",
            Action: formatActionTitle(a.title, linked),
            Description: formatActionDescription(a.description, linked),
            Priorité: priorityLabel(a.priority),
            Statut: statusLabel(a.status),
            Début: a.startDate ? new Date(a.startDate).toLocaleDateString("fr-FR") : "—",
            Échéance: a.dueDate || a.endDate
              ? new Date(a.dueDate || a.endDate!).toLocaleDateString("fr-FR")
              : "—",
          };
        });

    // One sheet per owner
    groupedByOwner.forEach(({ owner, items }) => {
      const ws = XLSX.utils.json_to_sheet(buildRows(items));
      // Column widths
      ws["!cols"] = [20, 20, 25, 35, 45, 10, 14, 12, 12].map((w) => ({ wch: w }));
      const safeName = owner.slice(0, 31).replace(/[:\\/?*[\]]/g, "_");
      XLSX.utils.book_append_sheet(wb, ws, safeName);
    });

    // Summary sheet with all actions
    const allRows = buildRows(filtered);
    if (allRows.length) {
      const wsAll = XLSX.utils.json_to_sheet(allRows);
      wsAll["!cols"] = [20, 20, 25, 35, 45, 10, 14, 12, 12].map((w) => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, wsAll, "Toutes les actions");
    }

    const date = new Date().toLocaleDateString("fr-FR").replace(/\//g, "-");
    XLSX.writeFile(wb, `Plan_action_${date}.xlsx`);
  };

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

    if (generic && catalogTitle) {
      // Si le titre catalogue est générique (ne contient pas le label du risque), on précise
      const catalogNorm = normalize(catalogTitle);
      const riskNorm = normalize(linked.riskLabel);
      if (!catalogNorm.includes(riskNorm) && !riskNorm.includes(catalogNorm)) {
        return `${catalogTitle} — ${linked.riskLabel}`;
      }
      return catalogTitle;
    }
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
        subtitle="Actions regroupées et priorisées"
        corner={
          <div className="flex items-center gap-2">
            {plan.canExportXLSX ? (
              <button
                onClick={exportXLSX}
                className="flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white shadow hover:bg-slate/80 transition"
                title="Exporter en Excel"
              >
                ↓ Export XLSX
              </button>
            ) : (
              <a
                href="/pricing"
                className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition"
                title="Fonctionnalité PME et Consultants"
              >
                ↓ Export XLSX — offre PME
              </a>
            )}
            <select
              className="rounded-xl border border-slate/20 bg-white px-3 py-2 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as ActionStatus | "")}
            >
              <option value="">Tous les statuts</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "TO_DO" ? "À faire" : s === "IN_PROGRESS" ? "En cours" : s === "LATE" ? "En retard" : "Terminé"}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {/* Switch de vue */}
        <div className="mb-1 flex items-center gap-1 rounded-xl border border-slate/15 bg-slate/5 p-1 w-fit">
          <button
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition ${viewMode === "owner" ? "bg-white text-ink shadow-sm" : "text-slate/60 hover:text-slate"}`}
            onClick={() => setViewMode("owner")}
          >
            <span aria-hidden="true">🗂️</span> Répartition
          </button>
          <button
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition ${viewMode === "unit" ? "bg-white text-ink shadow-sm" : "text-slate/60 hover:text-slate"}`}
            onClick={() => setViewMode("unit")}
          >
            <span aria-hidden="true">📅</span> Planification
          </button>
        </div>
        <p className="mb-4 text-xs text-slate/50">
          {viewMode === "owner"
            ? "Étape 1 — Vue d'ensemble par unité de travail puis par risque. Attribuez un responsable à chaque action."
            : "Étape 2 — Planifiez les actions dans le temps, unité par unité."}
        </p>

        {/* Filtre unités (uniquement en mode "par unité") */}
        {viewMode === "unit" && (
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
        )}

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

        {/* Vue par unité puis par risque */}
        {viewMode === "owner" && (
          <div className="space-y-4">
            {groupedByUnitThenRisk.length === 0 && actions.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-slate/20 px-6 py-8 text-center">
                <p className="text-3xl mb-2">📋</p>
                <p className="font-semibold text-ink text-base mb-1">Aucune action générée</p>
                <p className="text-sm text-slate/60 mb-4">Commencez par renseigner l'inventaire des risques, puis les actions seront générées automatiquement.</p>
                <a href="/inventaire" className="inline-block rounded-xl bg-kairos px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a50e0] transition">
                  Aller à l'inventaire →
                </a>
              </div>
            )}
            {groupedByUnitThenRisk.length === 0 && actions.length > 0 && (
              <p className="text-sm text-slate/70">Aucune action pour ce filtre.</p>
            )}
            {groupedByOwner.length > 0 && groupedByOwner.every(g => g.owner === "À affecter") && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                <span className="text-lg shrink-0">⚠</span>
                <p>Toutes les actions sont non affectées. Ouvrez chaque action (▼ tâches) et renseignez le champ <strong>Qui ?</strong> pour les assigner à un responsable.</p>
              </div>
            )}
            {groupedByUnitThenRisk.map(({ unitLabel, risks }) => {
              const unitItems = risks.flatMap((r) => r.items);
              const unitDone = unitItems.filter(a => a.status === "DONE").length;
              const unitProgress = unitItems.length ? Math.round((unitDone / unitItems.length) * 100) : 0;
              return (
                <div key={unitLabel} className="rounded-2xl border border-slate/10 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white bg-ocean">
                        🏢
                      </span>
                      <div>
                        <p className="font-semibold text-slate">{unitLabel}</p>
                        <p className="text-xs text-slate/60">{unitItems.length} action{unitItems.length > 1 ? "s" : ""} · {risks.length} risque{risks.length > 1 ? "s" : ""} · {unitProgress}% terminées</p>
                      </div>
                    </div>
                    {/* Barre de progression */}
                    <div className="hidden md:flex items-center gap-2">
                      <div className="w-32 h-2 rounded-full bg-slate/10 overflow-hidden">
                        <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${unitProgress}%` }} />
                      </div>
                      <span className="text-xs text-slate/60 w-8 text-right">{unitProgress}%</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {risks.map(({ riskLabel, items }) => {
                      const riskDone = items.filter(a => a.status === "DONE").length;
                      return (
                        <div key={riskLabel} className="rounded-xl border border-slate/10 bg-slate/5 p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate flex items-center gap-1.5">🎯 {riskLabel}</p>
                            <p className="text-xs text-slate/50 shrink-0">{riskDone}/{items.length} terminées</p>
                          </div>
                          <div className="space-y-2">
                            {items
                              .sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9))
                              .map((a) => {
                                const linked = a.assessmentId ? assessmentById.get(a.assessmentId) : undefined;
                                const owner = a.owner?.trim();
                                const statusColors: Record<string, string> = {
                                  TO_DO: "bg-slate/10 text-slate/60",
                                  IN_PROGRESS: "bg-ocean/10 text-ocean",
                                  LATE: "bg-red-100 text-red-600",
                                  DONE: "bg-lime/20 text-lime-700",
                                };
                                const statusLabels: Record<string, string> = {
                                  TO_DO: "À faire", IN_PROGRESS: "En cours", LATE: "En retard", DONE: "Terminé",
                                };
                                const steps = a.steps || [];
                                const stepsDone = steps.filter(s => s.done).length;
                                const isExpanded = expanded === a.id;
                                return (
                                  <div key={a.id} className="rounded-xl border border-slate/10 bg-white p-3">
                                    {/* Action header row */}
                                    <div className="flex items-start gap-3">
                                      <PriorityBadge priority={a.priority} />
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-slate">{formatActionTitle(a.title, linked)}</p>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate/60">
                                          {owner ? (
                                            <span>👤 {owner}</span>
                                          ) : (
                                            <span className="text-amber-600 font-medium">👤 À affecter</span>
                                          )}
                                          {(a.dueDate || a.endDate) && (
                                    <span className={a.status !== "DONE" && new Date(a.dueDate || a.endDate!) < new Date() ? "text-red-500 font-medium" : ""}>
                                      📅 {new Date(a.dueDate || a.endDate!).toLocaleDateString("fr-FR")}
                                    </span>
                                  )}
                                  {steps.length > 0 && (
                                    <span className="text-slate/50">{stepsDone}/{steps.length} tâches</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <select
                                  className={`rounded-lg border-0 px-2 py-1 text-xs font-medium ${statusColors[a.status] || "bg-slate/10"}`}
                                  value={a.status}
                                  onChange={(e) => updateActionStatus(a.id, e.target.value as ActionStatus)}
                                >
                                  {STATUSES.map((s) => (
                                    <option key={s} value={s}>{statusLabels[s]}</option>
                                  ))}
                                </select>
                                <button
                                  className="text-xs text-ocean/70 hover:text-ocean px-1"
                                  onClick={() => setExpanded(isExpanded ? null : a.id)}
                                  title="Tâches"
                                >
                                  {isExpanded ? "▲" : "▼"} tâches
                                </button>
                                <button
                                  className="text-xs text-red-400 hover:text-red-600"
                                  onClick={() => { if (window.confirm(`Supprimer cette action ?`)) removeAction(a.id); }}
                                  title="Supprimer"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            {/* Steps panel */}
                            {isExpanded && (
                              <div className="mt-3 space-y-1.5 border-t border-slate/10 pt-3">
                                {steps.length === 0 && (
                                  <p className="text-xs text-slate/40 italic mb-1">Aucune tâche. Ajoutez-en ci-dessous.</p>
                                )}
                                {steps.map((step) => (
                                  <div key={step.id} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={step.done}
                                      onChange={() => toggleActionStep(a.id, step.id)}
                                      className="h-3.5 w-3.5 rounded accent-kairos cursor-pointer"
                                    />
                                    <span className={`flex-1 text-xs ${step.done ? "line-through text-slate/35" : "text-slate/70"}`}>
                                      {step.label}
                                    </span>
                                    <button
                                      className="text-xs text-red-300 hover:text-red-500"
                                      onClick={() => updateAction(a.id, { steps: steps.filter(s => s.id !== step.id) })}
                                      title="Supprimer la tâche"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                                {/* Tâches suggérées depuis le catalogue */}
                                {(() => {
                                  const suggestions = getTasksForAssessment(linked)
                                    .filter(t => !steps.some(s => s.label === t));
                                  if (!suggestions.length) return null;
                                  return (
                                    <select
                                      className="mt-1 w-full rounded-lg border border-kairos/30 bg-kairos/5 px-2 py-1 text-xs text-kairos cursor-pointer"
                                      value=""
                                      onChange={(e) => {
                                        const label = e.target.value;
                                        if (!label) return;
                                        updateAction(a.id, { steps: [...steps, { id: crypto.randomUUID(), label, done: false }] });
                                      }}
                                    >
                                      <option value="">— Ajouter une tâche suggérée —</option>
                                      {suggestions.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                      ))}
                                    </select>
                                  );
                                })()}
                                {/* Ajout libre */}
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <input
                                    type="text"
                                    className="flex-1 rounded-lg border border-slate/20 bg-white px-2 py-1 text-xs placeholder:text-slate/30"
                                    placeholder="Nouvelle tâche libre..."
                                    value={newStepText[a.id] || ""}
                                    onChange={(e) => setNewStepText(prev => ({ ...prev, [a.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        const label = (newStepText[a.id] || "").trim();
                                        if (!label) return;
                                        updateAction(a.id, { steps: [...steps, { id: crypto.randomUUID(), label, done: false }] });
                                        setNewStepText(prev => ({ ...prev, [a.id]: "" }));
                                      }
                                    }}
                                  />
                                  <button
                                    className="rounded-lg bg-kairos/10 px-2 py-1 text-xs font-medium text-kairos hover:bg-kairos/20 transition"
                                    onClick={() => {
                                      const label = (newStepText[a.id] || "").trim();
                                      if (!label) return;
                                      updateAction(a.id, { steps: [...steps, { id: crypto.randomUUID(), label, done: false }] });
                                      setNewStepText(prev => ({ ...prev, [a.id]: "" }));
                                    }}
                                  >
                                    + Ajouter
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Vue par unité (existante) */}
        {viewMode === "unit" && (
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
                                Début
                                <input
                                  type="date"
                                  className="mt-1 w-full rounded-lg border border-slate/20 px-2 py-1 text-sm"
                                  value={getLocalDate(a.id, "start", a.startDate)}
                                  onChange={(e) => setLocalDates(prev => ({ ...prev, [a.id]: { ...prev[a.id], start: e.target.value } }))}
                                  onBlur={(e) => {
                                    const v = e.target.value;
                                    if (!v || v.length < 10) return;
                                    updateAction(a.id, { startDate: v });
                                  }}
                                />
                              </label>
                              <label className="block text-xs text-slate/60">
                                Fin
                                {(() => {
                                  const localEnd = getLocalDate(a.id, "end", a.endDate);
                                  const localStart = getLocalDate(a.id, "start", a.startDate);
                                  const invalid = !!localEnd && !!localStart && localEnd < localStart;
                                  return (
                                    <>
                                      <input
                                        type="date"
                                        className={`mt-1 w-full rounded-lg border px-2 py-1 text-sm ${invalid ? "border-red-400 bg-red-50" : "border-slate/20"}`}
                                        value={localEnd}
                                        min={localStart || undefined}
                                        onChange={(e) => setLocalDates(prev => ({ ...prev, [a.id]: { ...prev[a.id], end: e.target.value } }))}
                                        onBlur={(e) => {
                                          const v = e.target.value;
                                          if (!v || v.length < 10) return;
                                          const start = getLocalDate(a.id, "start", a.startDate);
                                          if (start && v < start) return;
                                          updateAction(a.id, { endDate: v });
                                        }}
                                      />
                                      {invalid && <p className="mt-0.5 text-xs text-red-500">La date de fin doit être ≥ à la date de début.</p>}
                                    </>
                                  );
                                })()}
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

          {filtered.length === 0 && actions.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-slate/20 px-6 py-8 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="font-semibold text-ink text-base mb-1">Aucune action générée</p>
              <p className="text-sm text-slate/60 mb-4">
                Les actions sont générées automatiquement depuis l'inventaire. Commencez par pré-remplir vos risques.
              </p>
              <a href="/inventaire" className="inline-block rounded-xl bg-kairos px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a50e0] transition">
                Aller à l'inventaire →
              </a>
            </div>
          )}
          {filtered.length === 0 && actions.length > 0 && (
            <p className="text-sm text-slate/70">Aucune action pour ce filtre.</p>
          )}
        </div>
        )}
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
