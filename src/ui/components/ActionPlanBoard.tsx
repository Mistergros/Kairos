import type { ActionPlan, ActionPlanItem } from "../../core/models/action";

interface ActionPlanBoardProps {
  plan?: ActionPlan;
}

function bucket(label: string, predicate: (item: ActionPlanItem) => boolean, items: ActionPlanItem[]) {
  return { label, items: items.filter(predicate) };
}

export function ActionPlanBoard({ plan }: ActionPlanBoardProps) {
  if (!plan) {
    return <div className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-100">Plan d'action non disponible</div>;
  }

  const buckets = [
    bucket("Immediat", (item) => item.priorityScore >= 120, plan.items),
    bucket("Priorite courte", (item) => item.priorityScore >= 80 && item.priorityScore < 120, plan.items),
    bucket("Suivi", (item) => item.priorityScore < 80, plan.items),
  ];

  return (
    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Plan d'action priorise</h3>
          <p className="text-sm text-slate-600">Actions regroupees par criticite</p>
        </div>
        <div className="text-xs text-slate-500">Genere le {new Date(plan.generatedAt).toLocaleDateString()}</div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {buckets.map((group) => (
          <div key={group.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{group.label}</div>
            <div className="mt-2 space-y-2">
              {group.items.slice(0, 5).map((item) => (
                <div key={item.action.id} className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-100">
                  <div className="text-sm font-semibold text-slate-900">{item.action.title}</div>
                  <div className="text-xs text-slate-500">
                    Score {item.priorityScore} • {item.relatedRiskIds.join(", ")}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 line-clamp-2">{item.action.impact}</div>
                </div>
              ))}
              {!group.items.length ? <div className="text-xs text-slate-500">Aucune action</div> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
