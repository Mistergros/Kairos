import type { ActionPlanItem } from "../../core/models/action";

export interface GanttTask {
  id: string;
  label: string;
  start: string;
  end: string;
  status: "not-started" | "in-progress" | "done";
}

export function buildGanttModel(items: ActionPlanItem[]): GanttTask[] {
  const startDate = new Date();
  return items.map((item, index) => {
    const start = new Date(startDate);
    start.setDate(start.getDate() + index * 3);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return {
      id: item.action.id,
      label: item.action.title,
      start: start.toISOString(),
      end: end.toISOString(),
      status: index === 0 ? "in-progress" : "not-started",
    };
  });
}
