import { create } from "zustand";

export type ActionItem = {
  id: string;
  workUnitId: string;
  action: string;
  priority: 1|2|3|4;
  owner?: string;
  dueDate?: string;
  status?: "À faire"|"En cours"|"Terminé";
  cost?: string;
};

export const usePlanStore = create<{
  actions: ActionItem[];
  addAction: (a: Omit<ActionItem,"id">) => void;
  updateAction: (id: string, p: Partial<ActionItem>) => void;
  removeAction: (id: string) => void;
}>((set) => ({
  actions: [],
  addAction: (a) => set((s) => ({ actions: [...s.actions, { id: crypto.randomUUID(), ...a }] })),
  updateAction: (id, p) => set((s) => ({ actions: s.actions.map(x => x.id === id ? { ...x, ...p } : x) })),
  removeAction: (id) => set((s) => ({ actions: s.actions.filter(x => x.id !== id) })),
}));
