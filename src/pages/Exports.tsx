import { Card } from "../components/Card";
import { useDuerpStore } from "../state/store";
import { printDuerpDocument, printDuerpSimplified, printDuerpMultiSites } from "../services/printService";

const downloadText = (filename: string, data: string, mime = "text/plain;charset=utf-8") => {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const Exports = () => {
  const { assessments, actions, versions, establishments, workUnits, selectedEstablishmentId } = useDuerpStore();

  const establishment = establishments.find((e) => e.id === selectedEstablishmentId) || establishments[0];
  const isTPE = (establishment?.headcount ?? 0) < 10 || !establishment?.headcount;
  const isMultiSites = establishments.length > 1;
  const estabWorkUnits = workUnits.filter((u) => !selectedEstablishmentId || u.establishmentId === selectedEstablishmentId);
  const estabAssessments = assessments.filter((a) =>
    estabWorkUnits.some((u) => u.id === a.workUnitId)
  );
  const estabActions = actions.filter((a) =>
    !a.establishmentId || a.establishmentId === (selectedEstablishmentId || establishments[0]?.id)
  );

  const exportCsv = () => {
    const header = "Unite;Categorie;Risque;G;F;M;Score;Priorite;Mesures existantes;Mesures proposees";
    const lines = estabAssessments.map((a) =>
      [
        estabWorkUnits.find((u) => u.id === a.workUnitId)?.name || a.workUnitId,
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
    const filename = `inventaire_risques_${establishment?.name || "duerp"}_${new Date().getFullYear()}.csv`;
    downloadText(filename, [header, ...lines].join("\n"), "text/csv;charset=utf-8");
  };

  const exportActions = () => {
    const header = "Action;Description;Responsable;Echeance;Statut;Priorite;Risque lie";
    const lines = estabActions.map((a) => {
      const linked = a.assessmentId ? estabAssessments.find((as) => as.id === a.assessmentId) : undefined;
      return [
        a.title,
        a.description || "",
        a.owner || "",
        a.dueDate ? new Date(a.dueDate).toLocaleDateString("fr-FR") : "",
        a.status,
        `P${a.priority}`,
        linked?.riskLabel || "",
      ].join(";");
    });
    const filename = `plan_action_${establishment?.name || "duerp"}_${new Date().getFullYear()}.csv`;
    downloadText(filename, [header, ...lines].join("\n"), "text/csv;charset=utf-8");
  };

  const exportJson = () => {
    const filename = `duerp_${establishment?.name || "export"}_${new Date().getFullYear()}.json`;
    downloadText(
      filename,
      JSON.stringify({ establishment, workUnits: estabWorkUnits, assessments: estabAssessments, actions: estabActions, versions }, null, 2),
      "application/json"
    );
  };

  const handlePrintPdf = () => {
    printDuerpDocument({ establishment, workUnits: estabWorkUnits, assessments: estabAssessments, actions: estabActions });
  };

  const handlePrintSimplified = () => {
    printDuerpSimplified({ establishment, workUnits: estabWorkUnits, assessments: estabAssessments, actions: estabActions });
  };

  const handlePrintMultiSites = () => {
    printDuerpMultiSites({ establishments, workUnits, assessments, actions });
  };

  const hasData = estabAssessments.length > 0;

  return (
    <div className="space-y-4">
      {!hasData && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <strong>Aucun risque évalué pour le moment.</strong> Ajoutez des unités de travail et laissez le moteur pré-remplir votre inventaire pour pouvoir exporter le DUERP.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card
          title="DUERP complet (PDF)"
          subtitle="Document légal conforme art. R.4121-1 du Code du travail"
        >
          <p className="mb-3 text-sm text-slate/70">
            Génère le Document Unique mis en page — unités, inventaire des risques coté G×F/M, plan d'action avec responsables, bloc de signatures.
          </p>
          <p className="mb-3 text-xs text-slate/50">
            Une boîte d'impression s'ouvre. Choisissez <strong>"Enregistrer en PDF"</strong> comme imprimante.
          </p>
          <button
            onClick={handlePrintPdf}
            className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-ink/90 transition disabled:opacity-40"
          >
            Générer le PDF
          </button>
        </Card>

        {isTPE && (
          <Card
            title="DUERP simplifié TPE (PDF)"
            subtitle="Format condensé — 1 à 2 pages, adapté aux < 10 salariés"
          >
            <p className="mb-3 text-sm text-slate/70">
              Résumé exécutif : risques P1/P2, actions prioritaires, bloc signature. Idéal pour les très petites entreprises.
            </p>
            <button
              onClick={handlePrintSimplified}
              className="rounded-xl bg-kairos px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 transition"
            >
              Générer PDF simplifié
            </button>
          </Card>
        )}

        {isMultiSites && (
          <Card
            title="Rapport multi-sites (PDF)"
            subtitle="Tous vos établissements consolidés en un document"
          >
            <p className="mb-3 text-sm text-slate/70">
              Vue consolidée de l'ensemble de vos {establishments.length} établissements : synthèse par site, risques critiques globaux.
            </p>
            <button
              onClick={handlePrintMultiSites}
              className="rounded-xl bg-azure px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 transition"
            >
              Générer rapport multi-sites
            </button>
          </Card>
        )}

        <Card
          title="Inventaire des risques (CSV)"
          subtitle="Toutes les cotations G / F / M / Score / Priorité"
        >
          <p className="mb-3 text-sm text-slate/70">
            Colonnes : unité, catégorie, risque, G, F, M, score, priorité, mesures existantes, mesures proposées. Compatible Excel.
          </p>
          <button
            onClick={exportCsv}
            className="rounded-xl bg-ocean px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-ocean/90 transition"
          >
            Télécharger CSV
          </button>
        </Card>

        <Card
          title="Plan d'action (CSV)"
          subtitle="Responsables, échéances, statuts, priorités"
        >
          <p className="mb-3 text-sm text-slate/70">
            Colonnes : action, description, responsable, échéance, statut, priorité, risque lié. Suivi opérationnel.
          </p>
          <button
            onClick={exportActions}
            className="rounded-xl bg-sunset px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-sunset/90 transition"
          >
            Télécharger CSV
          </button>
        </Card>

        <Card
          title="Sauvegarde complète (JSON)"
          subtitle="Établissement + inventaire + plan d'action + versions"
        >
          <p className="mb-3 text-sm text-slate/70">
            Export brut structuré. Utile pour l'archivage, la migration ou une reprise ultérieure.
          </p>
          <button
            onClick={exportJson}
            className="rounded-xl border border-slate/20 bg-white px-5 py-2.5 text-sm font-semibold text-slate shadow hover:bg-slate/5 transition"
          >
            Télécharger JSON
          </button>
        </Card>
      </div>
    </div>
  );
};
