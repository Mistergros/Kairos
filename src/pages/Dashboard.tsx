import { differenceInDays, differenceInMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Card } from '../components/Card';
import { PriorityBadge } from '../components/Badge';
import { useDuerpStore } from '../state/store';
import { ActionItem, Assessment, WorkUnit } from '../types';
import GanttDUERP, { GanttDUERPInput, GanttRiskItem } from '../components/GanttDUERP';

const soon = (actions: ActionItem[]) =>
  actions
    .filter((a) => a.dueDate && a.status !== 'DONE')
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    .slice(0, 3);

const upcomingTitle = (a: ActionItem) => {
  if (!a.dueDate) return 'Écheance non définie';
  const days = differenceInDays(new Date(a.dueDate), new Date());
  if (days < 0) return `En retard de ${Math.abs(days)} j`;
  if (days === 0) return "Échéance aujourd'hui";
  return `Dans ${days} jours`;
};

const computePriorityKpis = (assessments: Assessment[]) => {
  const grouped = assessments.reduce(
    (acc, a) => {
      acc[a.priority] = (acc[a.priority] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );
  return [
    { label: 'P1 Critiques', value: grouped[1] || 0, tone: 'text-sunset', bg: 'bg-red-50', border: 'border-red-100' },
    { label: 'P2 Hautes', value: grouped[2] || 0, tone: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
    { label: 'P3 Modérées', value: grouped[3] || 0, tone: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'P4 Surveiller', value: grouped[4] || 0, tone: 'text-lime-700', bg: 'bg-lime-50', border: 'border-lime-100' },
  ];
};

const riskPalette: Record<string, string> = {
  'Atmosphères explosives': '#F66CA0',
  'Incendie et évacuation': '#FF5A58',
  'Travail sur écran': '#22A9F1',
  Bruit: '#F58AB0',
};

const API_BASE = import.meta.env.VITE_DUERP_API_BASE || "http://localhost:8787";

export const Dashboard = () => {
  const { assessments, actions, workUnits, versions, selectedEstablishmentId, establishments } = useDuerpStore();
  const { user } = useUser();
  const [reminderStatus, setReminderStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const currentEstablishment = establishments.find((e) => e.id === selectedEstablishmentId) || establishments[0];

  const sendReminder = useCallback(async (monthsOld: number) => {
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email || !currentEstablishment) return;
    setReminderStatus("sending");
    try {
      const res = await fetch(`${API_BASE}/api/reminders/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, establishmentName: currentEstablishment.name, monthsOld }),
      });
      setReminderStatus(res.ok ? "sent" : "error");
    } catch {
      setReminderStatus("error");
    }
    setTimeout(() => setReminderStatus("idle"), 4000);
  }, [user, currentEstablishment]);
  const priorityKpis = useMemo(() => computePriorityKpis(assessments), [assessments]);
  const lateActions = actions.filter((a) => a.status === 'LATE');
  const nextActions = soon(actions);

  // KPI : taux de couverture (risques avec au moins une action planifiée)
  const coverage = useMemo(() => {
    if (!assessments.length) return null;
    const covered = assessments.filter((a) => actions.some((act) => act.assessmentId === a.id)).length;
    return Math.round((covered / assessments.length) * 100);
  }, [assessments, actions]);

  // KPI : avancement du plan d'action
  const actionProgress = useMemo(() => {
    if (!actions.length) return null;
    const done = actions.filter((a) => a.status === 'DONE').length;
    return Math.round((done / actions.length) * 100);
  }, [actions]);

  // Alerte révision annuelle
  const revisionAlert = useMemo(() => {
    const timestamps: number[] = [];
    assessments.forEach((a) => timestamps.push(new Date(a.updatedAt || a.createdAt).getTime()));
    versions.forEach((v) => timestamps.push(new Date(v.createdAt).getTime()));
    const valid = timestamps.filter((t) => Number.isFinite(t));
    if (!valid.length) return null;
    const lastUpdate = new Date(Math.max(...valid));
    const monthsOld = differenceInMonths(new Date(), lastUpdate);
    if (monthsOld >= 10) {
      return {
        months: monthsOld,
        urgent: monthsOld >= 12,
        lastDate: lastUpdate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      };
    }
    return null;
  }, [assessments, versions]);

  const ganttByUnit = useMemo(() => {
    if (!actions.length || !assessments.length) return [] as Array<{ unit: WorkUnit; data: GanttDUERPInput }>;
    const assessMap = new Map(assessments.map((a) => [a.id, a]));
    const unitMap = new Map(workUnits.map((u) => [u.id, u]));
    const byUnit = new Map<string, GanttRiskItem[]>();
    const bounds = new Map<string, { min: Date; max: Date }>();

    actions.forEach((a) => {
      if (!a.startDate || !a.endDate || !a.assessmentId) return;
      const assess = assessMap.get(a.assessmentId);
      if (!assess) return;
      const unit = unitMap.get(assess.workUnitId);
      if (!unit) return;
      const riskKey = assess.hazardId || assess.riskLabel || assess.id;
      const riskLabel = assess.riskLabel || 'Risque';
      if (!byUnit.has(unit.id)) byUnit.set(unit.id, []);
      if (!bounds.has(unit.id)) bounds.set(unit.id, { min: new Date(a.startDate), max: new Date(a.endDate) });

      const list = byUnit.get(unit.id)!;
      let risk = list.find((r) => r.riskId === riskKey);
      if (!risk) {
        risk = {
          riskId: riskKey,
          label: riskLabel,
          start: a.startDate,
          end: a.endDate,
          color: riskPalette[riskLabel],
          actions: [],
        };
        list.push(risk);
      }
      risk.actions.push({ id: a.id, label: a.title, start: a.startDate, end: a.endDate });

      const startA = new Date(a.startDate);
      const endA = new Date(a.endDate);
      const startR = new Date(risk.start);
      const endR = new Date(risk.end);
      if (startA < startR) risk.start = a.startDate;
      if (endA > endR) risk.end = a.endDate;

      const bound = bounds.get(unit.id)!;
      bounds.set(unit.id, {
        min: startA < bound.min ? startA : bound.min,
        max: endA > bound.max ? endA : bound.max,
      });
    });

    return Array.from(byUnit.entries()).map(([unitId, items]) => {
      const unit = unitMap.get(unitId)!;
      const bound = bounds.get(unitId);
      const start = bound?.min || new Date();
      const end = bound?.max || start;
      return {
        unit,
        data: {
          unitLabel: unit.activity ? `${unit.name} - ${unit.activity}` : unit.name,
          start,
          end,
          items,
        },
      };
    });
  }, [actions, assessments, workUnits]);

  const [ganttUnitTab, setGanttUnitTab] = useState<string>('all');
  const unitTabs = useMemo(
    () => workUnits.filter((u) => !selectedEstablishmentId || u.establishmentId === selectedEstablishmentId),
    [workUnits, selectedEstablishmentId]
  );

  useEffect(() => {
    if (ganttUnitTab !== 'all' && unitTabs.every((u) => u.id !== ganttUnitTab)) {
      setGanttUnitTab(unitTabs[0]?.id || 'all');
    }
    if (ganttUnitTab === 'all' && unitTabs.length === 1) {
      setGanttUnitTab(unitTabs[0].id);
    }
  }, [unitTabs, ganttUnitTab]);

  // ── Widget dirigeant ──────────────────────────────────────────────────────
  const lateCount = actions.filter((a) => a.status === "LATE").length;
  const p1Count = assessments.filter((a) => a.priority === 1).length;
  const p1NoOwner = actions.filter((a) => a.priority === 1 && !a.owner && a.status !== "DONE").length;
  const doneCount = actions.filter((a) => a.status === "DONE").length;
  const totalActions = actions.length;

  const globalStatus: "ok" | "warning" | "critical" =
    lateCount > 0 || p1Count > 3 ? "critical" : p1Count > 0 || (actionProgress ?? 0) < 30 ? "warning" : "ok";

  const statusConfig = {
    ok: { label: "Situation maîtrisée", color: "bg-green-100 text-green-800 border-green-200", dot: "bg-green-500" },
    warning: { label: "Points d'attention", color: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-400" },
    critical: { label: "Action requise", color: "bg-red-50 text-red-800 border-red-200", dot: "bg-red-500" },
  };

  return (
    <div className="space-y-5">

      {/* Widget dirigeant */}
      {assessments.length > 0 && (
        <div className={`rounded-2xl border px-5 py-4 ${statusConfig[globalStatus].color}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusConfig[globalStatus].dot}`} />
            <p className="font-bold text-base">Vue dirigeant — {statusConfig[globalStatus].label}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
            <div className="rounded-xl bg-white/60 px-3 py-2 text-center">
              <p className="text-2xl font-bold">{lateCount}</p>
              <p className="text-xs opacity-70">Action{lateCount !== 1 ? "s" : ""} en retard</p>
            </div>
            <div className="rounded-xl bg-white/60 px-3 py-2 text-center">
              <p className="text-2xl font-bold">{p1Count}</p>
              <p className="text-xs opacity-70">Risque{p1Count !== 1 ? "s" : ""} critiques P1</p>
            </div>
            <div className="rounded-xl bg-white/60 px-3 py-2 text-center">
              <p className="text-2xl font-bold">{p1NoOwner}</p>
              <p className="text-xs opacity-70">P1 sans responsable</p>
            </div>
            <div className="rounded-xl bg-white/60 px-3 py-2 text-center">
              <p className="text-2xl font-bold">{totalActions > 0 ? `${Math.round((doneCount / totalActions) * 100)}%` : "—"}</p>
              <p className="text-xs opacity-70">Plan d'action avancé</p>
            </div>
          </div>
          {p1NoOwner > 0 && (
            <p className="mt-2 text-xs opacity-75">
              ⚠ {p1NoOwner} risque{p1NoOwner > 1 ? "s" : ""} critique{p1NoOwner > 1 ? "s" : ""} sans responsable assigné — à traiter en priorité.
            </p>
          )}
        </div>
      )}

      {/* Alerte révision annuelle */}
      {revisionAlert && (
        <div className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${
          revisionAlert.urgent
            ? 'border-red-200 bg-red-50 text-red-800'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}>
          <span className="text-xl mt-0.5">{revisionAlert.urgent ? '🔴' : '🟡'}</span>
          <div>
            <p className="font-semibold text-sm">
              {revisionAlert.urgent
                ? `Mise à jour requise — DUERP non révisé depuis ${revisionAlert.months} mois`
                : `Révision recommandée dans ${12 - revisionAlert.months} mois`}
            </p>
            <p className="text-xs mt-0.5 opacity-80">
              Dernière modification : {revisionAlert.lastDate}.
              Le Code du travail (art. R.4121-2) impose une mise à jour annuelle minimum.
              {revisionAlert.urgent && ' Pensez à créer une nouvelle version depuis l\'onglet "Versions".'}
            </p>
            <button
              onClick={() => sendReminder(revisionAlert.months)}
              disabled={reminderStatus !== "idle"}
              className="mt-2 rounded-lg border border-current px-3 py-1 text-xs font-semibold opacity-80 hover:opacity-100 disabled:cursor-not-allowed"
            >
              {reminderStatus === "sending" ? "Envoi…" : reminderStatus === "sent" ? "✓ Rappel envoyé" : reminderStatus === "error" ? "Erreur d'envoi" : "M'envoyer un rappel par email"}
            </button>
          </div>
        </div>
      )}

      {/* KPIs priorités */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {priorityKpis.map((k) => (
          <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} px-4 py-4`}>
            <p className={`text-3xl font-bold ${k.tone}`}>{k.value}</p>
            <p className="text-xs text-slate/60 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* KPIs couverture + progression */}
      {(coverage !== null || actionProgress !== null) && (
        <div className="grid gap-3 md:grid-cols-2">
          {coverage !== null && (
            <div className="rounded-2xl border border-slate/10 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate/50 mb-1">Couverture des risques</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-ocean">{coverage}%</p>
                <p className="text-sm text-slate/60 mb-1">des risques ont une action planifiée</p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-ocean transition-all"
                  style={{ width: `${coverage}%` }}
                />
              </div>
            </div>
          )}
          {actionProgress !== null && (
            <div className="rounded-2xl border border-slate/10 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate/50 mb-1">Avancement du plan d'action</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-lime-700">{actionProgress}%</p>
                <p className="text-sm text-slate/60 mb-1">
                  des actions terminées ({actions.filter((a) => a.status === 'DONE').length}/{actions.length})
                </p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-lime-600 transition-all"
                  style={{ width: `${actionProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          title="Actions en retard"
          subtitle="Échéance dépassée et non terminées"
          corner={<span className="pill bg-slate/10 text-slate-700">{lateActions.length}</span>}
        >
          {lateActions.length === 0 && <p className="text-slate/70 text-sm">Aucune action en retard.</p>}
          <ul className="space-y-2">
            {lateActions.map((a) => (
              <li key={a.id} className="rounded-xl border border-red-100 bg-red-50/50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate text-sm">{a.title}</p>
                    {a.owner && <p className="text-xs text-slate/60">Responsable : {a.owner}</p>}
                    {a.dueDate && (
                      <p className="text-xs text-red-600">
                        Échéance : {format(new Date(a.dueDate), 'd MMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                  <PriorityBadge priority={a.priority} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Prochaines échéances"
          subtitle="3 actions les plus proches"
          corner={<span className="pill bg-ocean/10 text-ocean-700">{nextActions.length}</span>}
        >
          {nextActions.length === 0 && <p className="text-slate/70 text-sm">Aucune action à venir.</p>}
          <ul className="space-y-2">
            {nextActions.map((a) => (
              <li key={a.id} className="rounded-xl border border-slate/10 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate text-sm">{a.title}</p>
                    {a.owner && <p className="text-xs text-slate/60">Responsable : {a.owner}</p>}
                    <p className="text-xs text-slate/60">
                      {a.dueDate ? format(new Date(a.dueDate), 'd MMM yyyy', { locale: fr }) : 'Non planifiée'}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xs text-slate/60">{upcomingTitle(a)}</p>
                    <PriorityBadge priority={a.priority} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Roadmap (Gantt) par unité" subtitle="Barre épaisse = risque, barres fines = actions. Affichage mensuel.">
        {ganttByUnit.length === 0 && (
          <p className="text-sm text-slate/60">
            Aucune action datée pour le moment. Ajoutez des dates début/fin dans le plan d'action pour voir la roadmap.
          </p>
        )}

        {unitTabs.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <button
              className={`rounded-full border px-3 py-1 ${
                ganttUnitTab === 'all'
                  ? 'border-ocean bg-ocean/10 text-ocean font-semibold'
                  : 'border-slate/20 bg-white text-slate-700 hover:border-slate/40'
              }`}
              onClick={() => setGanttUnitTab('all')}
            >
              Toutes les unités
            </button>
            {unitTabs.map((u) => (
              <button
                key={u.id}
                className={`rounded-full border px-3 py-1 ${
                  ganttUnitTab === u.id
                    ? 'border-ocean bg-ocean/10 text-ocean font-semibold'
                    : 'border-slate/20 bg-white text-slate-700 hover:border-slate/40'
                }`}
                onClick={() => setGanttUnitTab(u.id)}
              >
                {u.name} {u.activity ? `— ${u.activity}` : ''}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-5">
          {(ganttUnitTab === 'all' ? ganttByUnit : ganttByUnit.filter((u) => u.unit.id === ganttUnitTab)).map((u) => (
            <div key={u.unit.id} className="rounded-xl border border-slate/10 bg-slate/5 p-3">
              <p className="mb-2 text-sm font-semibold text-slate">
                {u.unit.name}{u.unit.activity ? ` — ${u.unit.activity}` : ''}
              </p>
              {u.data.items.length === 0 ? (
                <p className="text-xs text-slate/60">Aucune action datée pour cette unité.</p>
              ) : (
                <GanttDUERP data={u.data} />
              )}
            </div>
          ))}

          {ganttUnitTab !== 'all' && ganttByUnit.filter((u) => u.unit.id === ganttUnitTab).length === 0 && (
            <div className="rounded-xl border border-slate/10 bg-slate/5 p-3">
              <p className="text-xs text-slate/60">Aucune action datée pour cette unité.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
