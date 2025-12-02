import clsx from "clsx";

export interface WizardStep {
  id: string;
  title: string;
  description: string;
}

interface StepsWizardProps {
  currentStep: number;
  steps?: WizardStep[];
}

const defaultSteps: WizardStep[] = [
  { id: "context", title: "1. Contexte", description: "Entreprise, NAF, unites de travail" },
  { id: "inventory", title: "2. Inventaire des risques", description: "Catalogue et specifique NAF" },
  { id: "evaluation", title: "3. Evaluation", description: "Scoring et priorisation" },
  { id: "plan", title: "4. Plan d'action", description: "Actions consolidees et suivi" },
  { id: "export", title: "5. Export DUERP", description: "PDF, Excel, audit" },
];

export function StepsWizard({ currentStep, steps = defaultSteps }: StepsWizardProps) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Assistant DUERP</h2>
          <p className="text-sm text-slate-600">Progression de la feuille de route</p>
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Blueprint</div>
      </div>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const status = index + 1 < currentStep ? "done" : index + 1 === currentStep ? "current" : "upcoming";
          return (
            <div key={step.id} className="flex items-start gap-3">
              <div
                className={clsx("flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold", {
                  "bg-emerald-600 text-white": status === "done",
                  "bg-blue-600 text-white": status === "current",
                  "bg-slate-200 text-slate-600": status === "upcoming",
                })}
              >
                {index + 1}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">{step.title}</div>
                <div className="text-xs text-slate-600">{step.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
