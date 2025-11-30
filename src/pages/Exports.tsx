import { Card } from '../components/Card';
import { useDuerpStore } from '../state/store';

const download = (filename: string, data: string) => {
  const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const Exports = () => {
  const { assessments, actions, versions } = useDuerpStore();

  const exportCsv = () => {
    const header = 'Unité;Catégorie;Risque;G;F;P;Score;Priorité;Mesures existantes;Mesures proposées';
    const lines = assessments.map(
      (a) =>
        [
          a.workUnitId,
          a.hazardCategory,
          a.riskLabel,
          a.gravity,
          a.frequency,
          a.control,
          a.score.toFixed(0),
          `P${a.priority}`,
          a.existingMeasures || '',
          a.proposedMeasures || '',
        ].join(';')
    );
    download('inventaire.csv', [header, ...lines].join('\n'));
  };

  const exportActions = () => {
    const header = 'Action;Responsable;Échéance;Statut;Priorité;Risque lié';
    const lines = actions.map((a) =>
      [
        a.title,
        a.owner || '',
        a.dueDate ? new Date(a.dueDate).toLocaleDateString('fr-FR') : '',
        a.status,
        `P${a.priority}`,
        a.assessmentId || '',
      ].join(';')
    );
    download('plan_action.csv', [header, ...lines].join('\n'));
  };

  const exportJson = () => {
    download('duerp.json', JSON.stringify({ assessments, actions, versions }, null, 2));
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card title="Export Excel/CSV" subtitle="Inventaire des risques">
        <p className="text-sm text-slate/70">
          Colonnes : catégorie, risque, G/F/P, score, priorité, mesures existantes et à proposer.
        </p>
        <button
          onClick={exportCsv}
          className="mt-3 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          Télécharger CSV
        </button>
      </Card>

      <Card title="Plan d’action" subtitle="Responsables, échéances, statut, priorité">
        <button
          onClick={exportActions}
          className="mt-2 rounded-xl bg-ocean px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          Export CSV
        </button>
      </Card>

      <Card title="Version complète (JSON)" subtitle="Inventaire + actions + versions">
        <button
          onClick={exportJson}
          className="mt-2 rounded-xl bg-sunset px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          Export JSON
        </button>
      </Card>
    </div>
  );
};
