import { Card } from "../components/Card";
import { useDuerpStore } from "../state/store";
import { useDuerpCoreStore } from "../state/stores/duerp.store";
import { ExportService } from "../core/services/export-service";

const exportService = new ExportService();

const downloadText = (filename: string, data: string, mime = "text/plain;charset=utf-8") => {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const downloadBinary = (filename: string, data: Uint8Array | ArrayBuffer, mime = "application/octet-stream") => {
  const view = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data);
  const blob = new Blob([view], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const Exports = () => {
  const { assessments, actions, versions } = useDuerpStore();
  const { duerp, actionPlan } = useDuerpCoreStore();

  const exportCsv = () => {
    const header = "Unite;Categorie;Risque;G;F;P;Score;Priorite;Mesures existantes;Mesures proposees";
    const lines = assessments.map((a) =>
      [
        a.workUnitId,
        a.hazardCategory,
        a.riskLabel,
        a.gravity,
        a.frequency,
        a.control,
        a.score.toFixed(0),
        `P${a.priority}`,
        a.existingMeasures || "",
        a.proposedMeasures || "",
      ].join(";")
    );
    downloadText("inventaire.csv", [header, ...lines].join("\n"), "text/csv;charset=utf-8");
  };

  const exportActions = () => {
    const header = "Action;Responsable;Echeance;Statut;Priorite;Risque lie";
    const lines = actions.map((a) =>
      [
        a.title,
        a.owner || "",
        a.dueDate ? new Date(a.dueDate).toLocaleDateString("fr-FR") : "",
        a.status,
        `P${a.priority}`,
        a.assessmentId || "",
      ].join(";")
    );
    downloadText("plan_action.csv", [header, ...lines].join("\n"), "text/csv;charset=utf-8");
  };

  const exportJson = () => {
    downloadText("duerp.json", JSON.stringify({ assessments, actions, versions }, null, 2), "application/json");
  };

  const exportDuerpPdf = async () => {
    if (!duerp) return;
    const pdf = await exportService.generatePdf(duerp, actionPlan);
    downloadBinary(`DUERP-${duerp.year}.pdf`, pdf, "application/pdf");
  };

  const exportDuerpCsv = () => {
    if (!duerp) return;
    const csv = exportService.generateExcel(duerp, actionPlan);
    downloadText(`DUERP-${duerp.year}.csv`, csv, "text/csv;charset=utf-8");
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card title="Export Excel/CSV" subtitle="Inventaire des risques">
        <p className="text-sm text-slate/70">
          Colonnes : categorie, risque, G/F/P, score, priorite, mesures existantes et a proposer.
        </p>
        <button
          onClick={exportCsv}
          className="mt-3 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          Telecharger CSV
        </button>
      </Card>

      <Card title="Plan d'action" subtitle="Responsables, echeances, statut, priorite">
        <button
          onClick={exportActions}
          className="mt-2 rounded-xl bg-ocean px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          Export CSV
        </button>
      </Card>

      <Card title="Version complete (JSON)" subtitle="Inventaire + actions + versions">
        <button
          onClick={exportJson}
          className="mt-2 rounded-xl bg-sunset px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          Export JSON
        </button>
      </Card>

      <Card title="DUERP (moteur coeur)" subtitle="Plan d'action + inventaire unifies">
        <div className="flex flex-col gap-2">
          <button
            onClick={exportDuerpPdf}
            className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg"
          >
            Telecharger PDF
          </button>
          <button
            onClick={exportDuerpCsv}
            className="rounded-xl bg-ocean px-4 py-2 text-sm font-semibold text-white shadow-lg"
          >
            Telecharger CSV
          </button>
        </div>
      </Card>
    </div>
  );
};
