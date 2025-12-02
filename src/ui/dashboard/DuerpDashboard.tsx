import { useMemo } from "react";
import { ActionPlanBoard } from "../components/ActionPlanBoard";
import { StepsWizard } from "../components/StepsWizard";
import { useDuerpCoreStore } from "../../state/stores/duerp.store";

export function DuerpDashboard() {
  const { duerp, actionPlan, compliance, nafCode } = useDuerpCoreStore();

  const topRisks = useMemo(() => {
    return (duerp?.risks || [])
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [duerp]);

  const missingObligations = compliance?.missing || [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard title="NAF" value={nafCode} hint="Profil secteur charge" />
        <StatCard title="Risques evalues" value={duerp?.risks.length || 0} hint="Catalogue + specifique NAF" />
        <StatCard title="Actions planifiees" value={actionPlan?.items.length || 0} hint="Priorite dynamique" />
        <StatCard title="Obligations manquantes" value={missingObligations.length} hint="Selon references legales" tone="warn" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <ActionPlanBoard plan={actionPlan} />
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between pb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Top risques</h3>
                <p className="text-sm text-slate-600">Scores issus du moteur</p>
              </div>
              <div className="text-xs text-slate-500">Couverture: {topRisks.length} / {duerp?.risks.length || 0}</div>
            </div>
            <div className="space-y-2">
              {topRisks.map((risk) => (
                <div key={risk.risk.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">{risk.risk.name}</div>
                    <span className="text-xs font-semibold text-blue-700">Score {risk.score}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Unite: {risk.unity.name} • Priorite {risk.priority}
                  </div>
                </div>
              ))}
              {!topRisks.length ? <div className="text-sm text-slate-500">Aucun risque evalue</div> : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <StepsWizard currentStep={3} />
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Obligations</h3>
                <p className="text-sm text-slate-600">Controle de conformite</p>
              </div>
            </div>
            <div className="space-y-2">
              {missingObligations.slice(0, 5).map((obligation) => (
                <div key={obligation.id} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                  <div className="text-sm font-semibold text-amber-900">{obligation.title}</div>
                  <div className="text-xs text-amber-700">{obligation.description}</div>
                </div>
              ))}
              {!missingObligations.length ? <div className="text-sm text-emerald-600">Toutes les obligations prioritaires sont couvertes.</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warn";
}

function StatCard({ title, value, hint, tone = "default" }: StatCardProps) {
  const toneClass = tone === "warn" ? "text-amber-600" : "text-blue-700";
  return (
    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
      {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}
