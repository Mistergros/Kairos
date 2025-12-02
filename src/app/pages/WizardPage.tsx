import { BlueprintLayout } from "../../ui/layouts/BlueprintLayout";
import { StepsWizard } from "../../ui/components/StepsWizard";
import { useDuerpCoreStore } from "../../state/stores/duerp.store";

export function WizardPage() {
  const { duerp, nafCode, units } = useDuerpCoreStore();
  return (
    <BlueprintLayout title="Parcours assiste" subtitle="Etapes pour consolider le DUERP">
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Configuration</h2>
              <p className="text-sm text-slate-600">NAF {nafCode} • {units.length} unites</p>
            </div>
          </div>
          <div className="space-y-2">
            {units.map((unit) => (
              <div key={unit.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="text-sm font-semibold text-slate-900">{unit.name}</div>
                <div className="text-xs text-slate-600">{unit.description || "Description a definir"}</div>
              </div>
            ))}
          </div>
        </div>
        <StepsWizard currentStep={duerp ? 4 : 2} />
      </div>
    </BlueprintLayout>
  );
}
