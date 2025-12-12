import { differenceInDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo, useState, useEffect } from 'react';
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
  if (!a.dueDate) return 'Echeance non definie';
  const days = differenceInDays(new Date(a.dueDate), new Date());
  if (days < 0) return `En retard de ${Math.abs(days)} j`;
  if (days === 0) return "Echeance aujourd'hui";
  return `Dans ${days} jours`;
};

const computeKpis = (assessments: Assessment[]) => {
  const grouped = assessments.reduce(
    (acc, a) => {
      acc[a.priority] = (acc[a.priority] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );
  return [
    { label: 'P1 Critiques', value: grouped[1] || 0, tone: 'text-sunset' },
    { label: 'P2 Hautes', value: grouped[2] || 0, tone: 'text-orange-500' },
    { label: 'P3 Moderees', value: grouped[3] || 0, tone: 'text-amber-500' },
    { label: 'P4 Surveiller', value: grouped[4] || 0, tone: 'text-lime-700' },
  ];
};

const riskPalette: Record<string, string> = {
  'Atmosph\u00e8res explosives': '#F66CA0',
  'Incendie et \u00e9vacuation': '#FF5A58',
  'Travail sur \u00e9cran': '#22A9F1',
  Bruit: '#F58AB0',
};

export const Dashboard = () => {
  const { assessments, actions, workUnits, selectedEstablishmentId } = useDuerpStore();
  const kpis = useMemo(() => computeKpis(assessments), [assessments]);
  const lateActions = actions.filter((a) => a.status === 'LATE');
  const nextActions = soon(actions);

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
      risk.actions.push({
        id: a.id,
        label: a.title,
        start: a.startDate,
        end: a.endDate,
      });

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
    () =>
      workUnits.filter((u) => !selectedEstablishmentId || u.establishmentId === selectedEstablishmentId),
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} title={k.label}>
            <p className={`text-4xl font-semibold ${k.tone}`}>{k.value}</p>
            <p className="text-sm text-slate/70">Inventaire DUERP</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          title="Actions en retard"
          subtitle="Actions planifiees avec echeance depassee"
          corner={<span className="pill bg-slate/10 text-slate-700">{lateActions.length}</span>}
        >
          {lateActions.length === 0 && <p className="text-slate/70 text-sm">Aucune action en retard.</p>}
          <ul className="space-y-3">
            {lateActions.map((a) => (
              <li key={a.id} className="rounded-xl border border-slate/10 bg-slate/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate">{a.title}</p>
                    <p className="text-xs text-slate/60">{a.description}</p>
                  </div>
                  <PriorityBadge priority={a.priority} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Prochaines echeances"
          subtitle="3 actions les plus proches"
          corner={<span className="pill bg-ocean/10 text-ocean-700">{nextActions.length}</span>}
        >
          {nextActions.length === 0 && <p className="text-slate/70 text-sm">Rien a venir.</p>}
          <ul className="space-y-3">
            {nextActions.map((a) => (
              <li key={a.id} className="rounded-xl border border-slate/10 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate">{a.title}</p>
                    <p className="text-xs text-slate/60">
                      {a.dueDate ? format(new Date(a.dueDate), 'd MMM yyyy', { locale: fr }) : 'Non planifiee'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate/60">{upcomingTitle(a)}</p>
                    <PriorityBadge priority={a.priority} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Roadmap (Gantt) par unite" subtitle="Barre epaisse = risque, barres fines = actions. Affichage mensuel.">
        {ganttByUnit.length === 0 && <p className="text-sm text-slate/60">Aucune action datee pour le moment.</p>}

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
              Toutes les unites
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
                {u.name} {u.activity ? `- ${u.activity}` : ''}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-6">
          {(ganttUnitTab === 'all' ? ganttByUnit : ganttByUnit.filter((u) => u.unit.id === ganttUnitTab)).map((u) => (
            <div key={u.unit.id} className="rounded-xl border border-slate/10 bg-slate/5 p-3">
              <p className="mb-2 text-sm font-semibold text-slate">
                {u.unit.name}{u.unit.activity ? ` - ${u.unit.activity}` : ''}
              </p>
              {u.data.items.length === 0 ? (
                <p className="text-xs text-slate/60">Aucune action datee pour cette unite.</p>
              ) : (
                <GanttDUERP data={u.data} />
              )}
            </div>
          ))}

          {ganttUnitTab !== 'all' && ganttByUnit.filter((u) => u.unit.id === ganttUnitTab).length === 0 && (
            <div className="rounded-xl border border-slate/10 bg-slate/5 p-3">
              <p className="mb-2 text-sm font-semibold text-slate">
                {unitTabs.find((u) => u.id === ganttUnitTab)?.name || "Unité"}
              </p>
              <p className="text-xs text-slate/60">Aucune action datee pour cette unite.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
