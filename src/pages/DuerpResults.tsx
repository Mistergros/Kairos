import { useState } from "react";
import type { ReactNode } from "react";
import { FeaturesPanel } from "../components/FeaturesPanel";
import type { ActionPlanItem, Action } from "../core/models/action";
import type { Obligation } from "../core/models/legal";
import type { Risk } from "../core/models/risk";
import type { RiskEvaluation, DUERP } from "../core/models/duerp";
import { ExportService } from "../core/services/export-service";

interface ComputeResponse {
  risks: Risk[];
  evaluations: (RiskEvaluation & { priorityLetter?: "H" | "M" | "B" })[];
  plan: { items: ActionPlanItem[]; generatedAt: string };
  obligations: Obligation[];
  meta?: { nafCode?: string; unity?: string; features?: Record<string, boolean> };
}

export function DuerpResults() {
  const [data, setData] = useState<ComputeResponse | null>(null);
  const exportService = new ExportService();

  const buildDuerp = (): DUERP | null => {
    if (!data) return null;
    const nafCode = data.meta?.nafCode || "47";
    const unityName = data.meta?.unity || "Unite";
    const units = [{ id: unityName.toLowerCase(), name: unityName }];
    const actions: Action[] = data.plan?.items?.map((it) => it.action) ?? [];
    return {
      id: "duerp-temp",
      year: new Date().getFullYear(),
      companyName: `NAF ${nafCode}`,
      nafCode,
      units,
      risks: data.evaluations,
      actions,
      history: [],
      actionPlan: data.plan as any,
    };
  };

  const exportPdf = async () => {
    const duerp = buildDuerp();
    if (!duerp || !data?.plan) return;
    const pdf = await exportService.generatePdf(duerp, data.plan as any);
    const buf = new ArrayBuffer(pdf.byteLength);
    new Uint8Array(buf).set(pdf);
    const blob = new Blob([buf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DUERP-${duerp.nafCode}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const duerp = buildDuerp();
    if (!duerp || !data?.plan) return;
    const csv = exportService.generateExcel(duerp, data.plan as any);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DUERP-${duerp.nafCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <FeaturesPanel onResult={setData} />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={exportPdf}
          className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          disabled={!data}
        >
          Exporter PDF
        </button>
        <button
          onClick={exportCsv}
          className="rounded-xl bg-ocean px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          disabled={!data}
        >
          Exporter CSV
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Risques identifies" subtitle="Catalogue + NAF + facteurs">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">ID</th>
                <th>Nom</th>
                <th>Categorie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.risks?.map((risk) => (
                <tr key={risk.id}>
                  <td className="py-2 text-xs text-slate-500">{risk.id}</td>
                  <td className="font-semibold text-slate-900">{risk.name}</td>
                  <td className="text-slate-700">{risk.category}</td>
                </tr>
              ))}
              {!data?.risks?.length ? (
                <tr>
                  <td colSpan={3} className="py-2 text-sm text-slate-500">
                    Aucun risque charge.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>

        <Card title="Evaluations" subtitle="Score et priorite H/M/B">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">Risque</th>
                <th>Score</th>
                <th>Priorite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.evaluations?.map((ev) => (
                <tr key={ev.risk.id}>
                  <td className="py-2 font-semibold text-slate-900">{ev.risk.name}</td>
                  <td className="text-slate-700">{ev.score}</td>
                  <td>
                    <Badge label={ev.priorityLetter || ev.priority} />
                  </td>
                </tr>
              ))}
              {!data?.evaluations?.length ? (
                <tr>
                  <td colSpan={3} className="py-2 text-sm text-slate-500">
                    Aucune evaluation.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Plan d'action" subtitle="Actions dedupees, priorite H/M/B">
          <div className="space-y-2">
            {data?.plan?.items?.map((item) => (
              <div key={item.action.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900">{item.action.title}</div>
                  <Badge label={priorityFromScore(item.priorityScore)} />
                </div>
                <div className="text-xs text-slate-600 line-clamp-2">{item.action.impact}</div>
              </div>
            ))}
            {!data?.plan?.items?.length ? <div className="text-sm text-slate-500">Aucune action.</div> : null}
          </div>
        </Card>

        <Card title="Obligations" subtitle="Selon NAF et facteurs">
          <div className="space-y-2">
            {data?.obligations?.map((ob) => (
              <div key={ob.id} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                <div className="text-sm font-semibold text-amber-900">{ob.title}</div>
                <div className="text-xs text-amber-700">{ob.description}</div>
              </div>
            ))}
            {!data?.obligations?.length ? <div className="text-sm text-slate-500">Aucune obligation specifique.</div> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
      <div className="pb-2">
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="text-sm text-slate-600">{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Badge({ label }: { label: string }) {
  const color =
    label === "H" || label === "critical"
      ? "bg-red-100 text-red-700"
      : label === "M" || label === "high" || label === "medium"
      ? "bg-amber-100 text-amber-700"
      : "bg-emerald-100 text-emerald-700";
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${color}`}>{label}</span>;
}

function priorityFromScore(score: number): "H" | "M" | "B" {
  if (score >= 80) return "H";
  if (score >= 50) return "M";
  return "B";
}
