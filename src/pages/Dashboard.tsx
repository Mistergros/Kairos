import { differenceInDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo } from 'react';
import { Card } from '../components/Card';
import { PriorityBadge } from '../components/Badge';
import { useDuerpStore } from '../state/store';
import { ActionItem, Assessment } from '../types';

const soon = (actions: ActionItem[]) =>
  actions
    .filter((a) => a.dueDate && a.status !== 'DONE')
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    .slice(0, 3);

const upcomingTitle = (a: ActionItem) => {
  if (!a.dueDate) return 'Échéance non définie';
  const days = differenceInDays(new Date(a.dueDate), new Date());
  if (days < 0) return `En retard de ${Math.abs(days)} j`;
  if (days === 0) return 'Échéance aujourd’hui';
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
    { label: 'P3 Modérées', value: grouped[3] || 0, tone: 'text-amber-500' },
    { label: 'P4 Surveiller', value: grouped[4] || 0, tone: 'text-lime-700' },
  ];
};

export const Dashboard = () => {
  const { assessments, actions } = useDuerpStore();
  const kpis = useMemo(() => computeKpis(assessments), [assessments]);
  const lateActions = actions.filter((a) => a.status === 'LATE');
  const nextActions = soon(actions);

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
          subtitle="Actions planifiées avec échéance dépassée"
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
          title="Prochaines échéances"
          subtitle="3 actions les plus proches"
          corner={<span className="pill bg-ocean/10 text-ocean-700">{nextActions.length}</span>}
        >
          {nextActions.length === 0 && <p className="text-slate/70 text-sm">Rien à venir.</p>}
          <ul className="space-y-3">
            {nextActions.map((a) => (
              <li key={a.id} className="rounded-xl border border-slate/10 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate">{a.title}</p>
                    <p className="text-xs text-slate/60">
                      {a.dueDate ? format(new Date(a.dueDate), 'd MMM yyyy', { locale: fr }) : 'Non planifiée'}
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
    </div>
  );
};
