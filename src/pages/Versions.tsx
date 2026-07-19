import { useState } from 'react';
import { Card } from '../components/Card';
import { useDuerpStore } from '../state/store';

export const Versions = () => {
  const { versions, createVersion } = useDuerpStore();
  const [form, setForm] = useState({ label: 'Version DUERP', reason: '' });
  const [expanded, setExpanded] = useState<string | null>(null);

  const onCreate = () => {
    if (!form.label) return;
    createVersion(form.label, form.reason);
    setForm({ label: 'Version DUERP', reason: '' });
  };

  return (
    <div className="space-y-5">
      <Card title="Versions & Historique" subtitle="Instantané archivé à chaque mise à jour, consultable à tout moment">
        <div className="space-y-3">
          {versions.map((v) => {
            const isExpanded = expanded === v.id;
            const snapshot = v.snapshot;
            return (
              <div key={v.id} className="rounded-2xl border border-slate/10 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate">{v.label}</p>
                    <p className="text-xs text-slate/60">
                      {new Date(v.createdAt).toLocaleString('fr-FR')} • {v.reason || 'Motif non renseigné'}
                    </p>
                    <p className="text-xs font-mono text-slate/70">hash: {v.hash}</p>
                  </div>
                  <button
                    className="rounded-xl bg-slate/10 px-3 py-2 text-xs font-semibold text-slate hover:bg-slate/20 transition"
                    onClick={() => setExpanded(isExpanded ? null : v.id)}
                  >
                    {isExpanded ? "▲ Masquer" : "▼ Voir le contenu archivé"}
                  </button>
                </div>
                {isExpanded && (
                  <div className="mt-3 border-t border-slate/10 pt-3">
                    {!snapshot ? (
                      <p className="text-xs text-slate/50 italic">
                        Version créée avant l'activation de l'archivage complet — seule l'empreinte (hash) a été conservée, le détail des risques et actions n'est pas disponible.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-slate/60">
                          {snapshot.workUnits.length} unité(s) • {snapshot.assessments.length} risque(s) • {snapshot.actions.length} action(s) au moment de cette version
                        </p>
                        <div className="max-h-72 overflow-y-auto space-y-1.5">
                          {snapshot.assessments.map((a) => {
                            const unit = snapshot.workUnits.find((u) => u.id === a.workUnitId);
                            return (
                              <div key={a.id} className="flex items-center gap-2 rounded-lg bg-slate/3 px-2.5 py-1.5 text-xs">
                                <span className="font-medium text-slate flex-1 min-w-0 truncate">{a.riskLabel}</span>
                                {unit && <span className="text-slate/50 shrink-0">{unit.name}</span>}
                                <span className="text-slate/40 shrink-0">P{a.priority}</span>
                              </div>
                            );
                          })}
                          {snapshot.assessments.length === 0 && (
                            <p className="text-xs text-slate/40 italic">Aucun risque enregistré à cette date.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {versions.length === 0 && <p className="text-sm text-slate/70">Aucune version enregistrée pour le moment.</p>}
        </div>
      </Card>

      <Card title="Créer une version" subtitle="Archive l'état complet des unités, risques et actions à cette date">
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded-xl border border-slate/20 px-3 py-2"
            placeholder="Label"
            value={form.label}
            onChange={(e) => setForm((v) => ({ ...v, label: e.target.value }))}
          />
          <input
            className="rounded-xl border border-slate/20 px-3 py-2"
            placeholder="Motif (mise à jour, accident...)"
            value={form.reason}
            onChange={(e) => setForm((v) => ({ ...v, reason: e.target.value }))}
          />
        </div>
        <button
          onClick={onCreate}
          className="mt-4 rounded-2xl bg-gradient-to-r from-ocean to-sunset px-6 py-3 text-sm font-semibold text-white shadow-lg"
        >
          Sauvegarder la version
        </button>
      </Card>
    </div>
  );
};
