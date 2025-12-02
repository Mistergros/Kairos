import { create } from "zustand";
import { getRisksFor, loadRiskCatalog } from "../../core/engine/risk-engine";
import type { Risk } from "../../core/models/risk";

interface RiskCatalogState {
  nafCode: string;
  unity?: string;
  risks: Risk[];
  refresh: (nafCode: string, unity?: string) => void;
}

const initial = loadRiskCatalog();

export const useRiskCatalogStore = create<RiskCatalogState>((set) => ({
  nafCode: "56",
  risks: initial,
  refresh: (nafCode: string, unity?: string) => set({ nafCode, unity, risks: getRisksFor(nafCode, unity) }),
}));
