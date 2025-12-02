import type { ActionPlanItem } from "../../core/models/action";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  priorityScore: number;
}

export function buildCalendar(items: ActionPlanItem[]): CalendarEvent[] {
  const base = new Date();
  return items.map((item, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index * 2 + 1);
    return {
      id: item.action.id,
      title: item.action.title,
      date: date.toISOString(),
      priorityScore: item.priorityScore,
    };
  });
}
