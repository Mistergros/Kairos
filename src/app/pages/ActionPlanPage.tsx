import { BlueprintLayout } from "../../ui/layouts/BlueprintLayout";
import { ActionPlanBoard } from "../../ui/components/ActionPlanBoard";
import { buildGanttModel } from "../../modules/action-plan/gantt";
import { buildReminders } from "../../modules/action-plan/reminders";
import { useDuerpCoreStore } from "../../state/stores/duerp.store";

export function ActionPlanPage() {
  const { actionPlan } = useDuerpCoreStore();
  const gantt = actionPlan ? buildGanttModel(actionPlan.items) : [];
  const reminders = actionPlan ? buildReminders(actionPlan.items) : [];

  return (
    <BlueprintLayout title="Plan d'action" subtitle="Vue Kanban, Gantt et rappels">
      <div className="space-y-4">
        <ActionPlanBoard plan={actionPlan} />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-lg font-semibold text-slate-900">Gantt simplifie</h3>
              <span className="text-xs text-slate-500">{gantt.length} taches</span>
            </div>
            <div className="space-y-2">
              {gantt.slice(0, 5).map((task) => (
                <div key={task.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">{task.label}</div>
                    <span className="text-xs text-blue-700">{task.status}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    {new Date(task.start).toLocaleDateString()} → {new Date(task.end).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {!gantt.length ? <div className="text-sm text-slate-500">Aucun jalon disponible.</div> : null}
            </div>
          </div>
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-lg font-semibold text-slate-900">Rappels</h3>
              <span className="text-xs text-slate-500">{reminders.length} rappels</span>
            </div>
            <div className="space-y-2">
              {reminders.slice(0, 5).map((reminder) => (
                <div key={reminder.relatedActionId} className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <div className="text-sm font-semibold text-emerald-900">{reminder.message}</div>
                  <div className="text-xs text-emerald-700">
                    Due le {new Date(reminder.dueDate).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {!reminders.length ? <div className="text-sm text-slate-500">Pas de rappel en attente.</div> : null}
            </div>
          </div>
        </div>
      </div>
    </BlueprintLayout>
  );
}
