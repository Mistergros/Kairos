import { useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { PriorityBadge } from '../components/Badge';
import { useDuerpStore } from '../state/store';
import { ActionStatus, Priority } from '../types';

const statuses: ActionStatus[] = ['TO_DO', 'IN_PROGRESS', 'LATE', 'DONE'];

export const ActionPlan = () => {
  const { actions, assessments, selectedEstablishmentId, addAction, updateActionStatus, toggleActionStep } =
    useDuerpStore();
  const [filter, setFilter] = useState<ActionStatus | ''>('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    owner: '',
    dueDate: '',
    assessmentId: '',
    priority: 3 as Priority,
  });

  const filtered = useMemo(
    () =>
      actions
        .filter((a) => a.establishmentId === selectedEstablishmentId)
        .filter((a) => (filter ? a.status === filter : true)),
    [actions, selectedEstablishmentId, filter]
  );

  const stats = useMemo(() => {
    const total = filtered.length;
    const done = filtered.filter((a) => a.status === 'DONE').length;
    const overdue = filtered.filter(
      (a) => a.status !== 'DONE' && a.dueDate && new Date(a.dueDate) < new Date()
    ).length;
    const progress = total ? Math.round((done * 100) / total) : 0;
    return { total, done, overdue, progress };
  }, [filtered]);

  const linkedAssessments = assessments.filter((a) => a);

  const onAdd = () => {
    if (!form.title || !selectedEstablishmentId) return;
    addAction({
      establishmentId: selectedEstablishmentId,
      assessmentId: form.assessmentId || undefined,
      title: form.title,
      description: form.description,
      owner: form.owner,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      status: 'TO_DO',
      cost: undefined,
      priority: form.priority,
    });
    setForm({ title: '', description: '', owner: '', dueDate: '', assessmentId: '', priority: 3 });
  };

  return (
    <div className="space-y-5">
      <Card
        title="Plan d'action"
        subtitle="Actions proposées automatiquement ou ajout manuel"
        corner={
          <select
            className="rounded-xl border border-slate/20 bg-white px-3 py-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as ActionStatus | '')}
          >
            <option value="">Tous les statuts</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        }
      >
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
        <div className="space-y-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-slate/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate">{a.title}</p>
                  <p className="text-sm text-slate/60">{a.description || 'Description à compléter'}</p>
                  {a.assessmentId && (
                    <p className="mt-1 text-xs text-slate/60">
                      Risque lié: {assessments.find((x) => x.id === a.assessmentId)?.riskLabel}
                    </p>
                  )}
                </div>
                <div className="text-right space-y-2">
                  <PriorityBadge priority={a.priority} />
                  <select
                    className="rounded-xl border border-slate/20 bg-slate/5 px-2 py-1 text-xs"
                    value={a.status}
                    onChange={(e) => updateActionStatus(a.id, e.target.value as ActionStatus)}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {a.dueDate && (
                    <p className="text-xs text-slate/60">Échéance: {new Date(a.dueDate).toLocaleDateString('fr-FR')}</p>
                  )}
                  <button
                    className="text-xs text-ocean underline"
                    onClick={() => setExpanded((prev) => (prev === a.id ? null : a.id))}
                  >
                    {expanded === a.id ? 'Masquer le détail' : 'Afficher le détail'}
                  </button>
                </div>
              </div>
              {expanded === a.id && (
                <div className="mt-3 rounded-xl border border-slate/10 bg-slate/5 p-3 text-sm text-slate/80">
                  <p>Responsable: {a.owner || 'À affecter'}</p>
                  <p>Priorité: P{a.priority}</p>
                  {a.steps && a.steps.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-slate">Checklist</p>
                      <ul className="mt-1 space-y-1">
                        {a.steps.map((step) => (
                          <li key={step.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={step.done}
                              onChange={() => toggleActionStep(a.id, step.id)}
                              className="h-4 w-4 rounded border-slate/50"
                            />
                            <span className={step.done ? 'line-through text-slate/50' : ''}>{step.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!a.steps && <p className="text-xs text-slate/60">Ajoutez des étapes concrètes pour suivre l'exécution.</p>}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-slate/70">Aucune action pour ce filtre.</p>}
        </div>
      </Card>

      <Card title="Proposer une action" subtitle="Aligner les actions sur le niveau de priorité du risque">
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
            {linkedAssessments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.riskLabel} ({a.hazardCategory})
              </option>
            ))}
          </select>
          <input
            className="rounded-xl border border-slate/20 px-3 py-2"
            placeholder="Responsable"
            value={form.owner}
            onChange={(e) => setForm((v) => ({ ...v, owner: e.target.value }))}
          />
          <input
            type="date"
            className="rounded-xl border border-slate/20 px-3 py-2"
            value={form.dueDate}
            onChange={(e) => setForm((v) => ({ ...v, dueDate: e.target.value }))}
          />
          <textarea
            className="md:col-span-2 rounded-xl border border-slate/20 px-3 py-2"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))}
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
        >
          Ajouter l'action
        </button>
      </Card>
    </div>
  );
};

// Compatibilité import par défaut
export default ActionPlan;
