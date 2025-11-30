import { useState } from 'react';
import { Card } from '../components/Card';
import { useDuerpStore } from '../state/store';

export const Versions = () => {
  const { versions, createVersion } = useDuerpStore();
  const [form, setForm] = useState({ label: 'Version DUERP', reason: '' });

  const onCreate = () => {
    if (!form.label) return;
    createVersion(form.label, form.reason);
    setForm({ label: 'Version DUERP', reason: '' });
  };

  return (
    <div className="space-y-5">
      <Card title="Versions & Historique" subtitle="Horodatage, hash, motif">
        <div className="space-y-3">
          {versions.map((v) => (
            <div key={v.id} className="rounded-2xl border border-slate/10 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-slate">{v.label}</p>
                  <p className="text-xs text-slate/60">
                    {new Date(v.createdAt).toLocaleString('fr-FR')} • {v.reason || 'Motif non renseigné'}
                  </p>
                  <p className="text-xs font-mono text-slate/70">hash: {v.hash}</p>
                </div>
                <button className="rounded-xl bg-slate/10 px-3 py-2 text-xs font-semibold text-slate">
                  Restaurer en brouillon
                </button>
              </div>
            </div>
          ))}
          {versions.length === 0 && <p className="text-sm text-slate/70">Aucune version enregistrée pour le moment.</p>}
        </div>
      </Card>

      <Card title="Créer une version" subtitle="Génère une empreinte (hash) du périmètre et de l’inventaire">
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
