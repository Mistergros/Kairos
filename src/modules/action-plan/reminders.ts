import type { ActionPlanItem } from "../../core/models/action";

export interface Reminder {
  message: string;
  dueDate: string;
  relatedActionId: string;
}

export function buildReminders(items: ActionPlanItem[]): Reminder[] {
  const today = new Date();
  return items.slice(0, 5).map((item, index) => {
    const due = new Date(today);
    due.setDate(today.getDate() + (index + 1) * 3);
    return {
      message: `Verifier l'avancement de "${item.action.title}"`,
      dueDate: due.toISOString(),
      relatedActionId: item.action.id,
    };
  });
}
