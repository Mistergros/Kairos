import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { useDuerpStore } from '../state/store';
import { usePlan } from '../hooks/usePlan';
import { printDuerpDocument } from '../services/printService';
import { cachedBranding, loadBranding } from '../services/brandingService';
import type { Branding, Establishment, VersionEntry } from '../types';

// Historique des versions, groupé par établissement (archivés compris) : le
// DUERP et ses versions successives doivent être conservés 40 ans, et chaque
// version peut être consultée et réimprimée telle qu'elle était à sa date.
export const Versions = () => {
  const { versions, createVersion, establishments, archivedEstablishments, selectedEstablishmentId } = useDuerpStore();
  const plan = usePlan();
  const navigate = useNavigate();
  const [form, setForm] = useState({ label: 'Version DUERP', reason: '' });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [branding, setBranding] = useState<Branding>(cachedBranding);

  useEffect(() => {
    loadBranding().then(setBranding).catch(() => {});
  }, []);

  const current = establishments.find((e) => e.id === selectedEstablishmentId) || establishments[0];
  const known = new Map<string, Establishment>([...archivedEstablishments, ...establishments].map((e) => [e.id, e]));

  // Établissement courant d'abord, puis les autres actifs, puis les archivés.
  const groupIds = Array.from(new Set(versions.map((v) => v.establishmentId))).sort((a, b) => {
    const rank = (id: string) => (id === current?.id ? 0 : known.get(id)?.archivedAt ? 2 : 1);
    return rank(a) - rank(b);
  });

  const onCreate = () => {
    if (!form.label || !current) return;
    createVersion(form.label, form.reason);
    setForm({ label: 'Version DUERP', reason: '' });
  };

  const printVersion = (v: VersionEntry) => {
    if (!plan.canExportDocuments) return navigate('/pricing');
    const snap = v.snapshot;
    if (!snap) return;
    printDuerpDocument({
      establishment: snap.establishment || known.get(v.establishmentId),
      workUnits: snap.workUnits,
      assessments: snap.assessments,
      actions: snap.actions,
      versions: [v],
      asOf: v.createdAt,
      branding: plan.canBrandDocuments ? branding : undefined,
    });
  };

  return (
    <div className="space-y-5">
      <Card title="Versions & Historique" subtitle="Chaque version est conservée et peut être réimprimée telle qu'elle était à sa date">
        <p className="mb-4 text-xs text-slate/60">
          Le Code du travail impose de conserver le document unique et ses versions successives pendant 40 ans (art. L.4121-3-1).
          Un établissement archivé garde tout son historique ici.
        </p>
        <div className="space-y-6">
          {groupIds.map((estId) => {
            const est = known.get(estId);
            const list = versions.filter((v) => v.establishmentId === estId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
            const name = est?.name || list.find((v) => v.snapshot?.establishment)?.snapshot?.establishment?.name || 'Établissement';
            return (
              <section key={estId}>
                <h3 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate">
                  {name}
                  {est?.archivedAt && (
                    <span className="rounded-full bg-slate/10 px-2 py-0.5 text-xs font-medium text-slate/70">
                      archivé le {new Date(est.archivedAt).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </h3>
                <div className="space-y-3">
                  {list.map((v) => {
                    const isExpanded = expanded === v.id;
                    const snapshot = v.snapshot;
                    return (
                      <div key={v.id} className="rounded-2xl border border-slate/10 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-slate">{v.label}</p>
                            <p className="text-xs text-slate/60">
                              {new Date(v.createdAt).toLocaleString('fr-FR')} • {v.reason || 'Motif non renseigné'}
                            </p>
                            <p className="text-xs font-mono text-slate/50">empreinte : {v.hash}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {snapshot && (
                              <button
                                className="rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-ink/90 transition"
                                onClick={() => printVersion(v)}
                                title={plan.canExportDocuments ? 'PDF du DUERP tel qu’il était à cette date' : 'Téléchargement inclus dans les offres payantes'}
                              >
                                Télécharger le PDF
                              </button>
                            )}
                            <button
                              className="rounded-xl bg-slate/10 px-3 py-2 text-xs font-semibold text-slate hover:bg-slate/20 transition"
                              onClick={() => setExpanded(isExpanded ? null : v.id)}
                            >
                              {isExpanded ? '▲ Masquer' : '▼ Voir le contenu'}
                            </button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="mt-3 border-t border-slate/10 pt-3">
                            {!snapshot ? (
                              <p className="text-xs text-slate/50 italic">
                                Version créée avant l'activation de l'archivage complet : seule l'empreinte a été conservée, le détail des risques et actions n'est pas disponible.
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
                </div>
              </section>
            );
          })}
          {versions.length === 0 && <p className="text-sm text-slate/70">Aucune version enregistrée pour le moment.</p>}
        </div>
      </Card>

      <Card
        title="Créer une version"
        subtitle={current ? `Archive l'état complet de « ${current.name} » (unités, risques, actions) à cette date` : "Créez d'abord un établissement"}
      >
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input
            className="rounded-xl border border-slate/20 px-3 py-2"
            placeholder="Nom de la version"
            value={form.label}
            onChange={(e) => setForm((v) => ({ ...v, label: e.target.value }))}
          />
          <input
            className="rounded-xl border border-slate/20 px-3 py-2"
            placeholder="Motif (mise à jour annuelle, accident, nouvel équipement…)"
            value={form.reason}
            onChange={(e) => setForm((v) => ({ ...v, reason: e.target.value }))}
          />
        </div>
        <button
          onClick={onCreate}
          disabled={!current}
          className="mt-4 rounded-2xl bg-gradient-to-r from-ocean to-sunset px-6 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
        >
          Sauvegarder la version
        </button>
      </Card>
    </div>
  );
};
