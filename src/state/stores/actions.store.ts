import { create } from "zustand";
import type { ActionPlan, ActionPlanItem } from "../../core/models/action";

interface ActionPlanState {
  plan?: ActionPlan;
  highlighted?: ActionPlanItem;
  setPlan: (plan: ActionPlan) => void;
  highlight: (item?: ActionPlanItem) => void;
}

export const useActionPlanStore = create<ActionPlanState>((set) => ({
  plan: undefined,
  highlighted: undefined,
  setPlan: (plan) => set({ plan }),
  highlight: (item) => set({ highlighted: item }),
}));
