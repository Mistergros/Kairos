import type { ActionPlanItem } from "../../core/models/action";

export interface KanbanColumn {
  key: "todo" | "doing" | "review" | "done";
  title: string;
  items: ActionPlanItem[];
}

export function buildKanbanBoard(items: ActionPlanItem[]): KanbanColumn[] {
  const sorted = [...items].sort((a, b) => b.priorityScore - a.priorityScore);
  return [
    { key: "todo", title: "A planifier", items: sorted.slice(0, 3) },
    { key: "doing", title: "En cours", items: sorted.slice(3, 5) },
    { key: "review", title: "A verifier", items: sorted.slice(5, 7) },
    { key: "done", title: "Cloture", items: sorted.slice(7) },
  ];
}
