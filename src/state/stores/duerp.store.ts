import { create } from "zustand";
import type { ActionPlan } from "../../core/models/action";
import type { ComplianceReport } from "../../core/models/legal";
import type { DUERP } from "../../core/models/duerp";
import type { Unity } from "../../core/models/unity";
import { DUERPService } from "../../core/services/duerp-service";

interface DuerpCoreState {
  companyName: string;
  nafCode: string;
  year: number;
  units: Unity[];
  duerp?: DUERP;
  actionPlan?: ActionPlan;
  compliance?: ComplianceReport;
  refresh: () => void;
  setNafCode: (nafCode: string) => void;
  setUnits: (units: Unity[]) => void;
}

const service = new DUERPService();
const defaultUnits: Unity[] = [
  { id: "unit-magasin", name: "Magasin", description: "Surface de vente" },
  { id: "unit-accueil", name: "Accueil", description: "Relation client" },
  { id: "unit-bureau", name: "Bureau", description: "Fonctions support" },
];

const bootstrap = service.generate({
  companyName: "Votre entreprise",
  year: new Date().getFullYear(),
  nafCode: "47",
  units: defaultUnits,
});

export const useDuerpCoreStore = create<DuerpCoreState>((set, get) => ({
  companyName: "Votre entreprise",
  nafCode: "47",
  year: new Date().getFullYear(),
  units: defaultUnits,
  duerp: bootstrap.duerp,
  actionPlan: bootstrap.actionPlan,
  compliance: bootstrap.compliance,
  refresh: () => {
    const state = get();
    const bundle = service.generate({
      companyName: state.companyName,
      year: state.year,
      nafCode: state.nafCode,
      units: state.units,
    });
    set({ duerp: bundle.duerp, actionPlan: bundle.actionPlan, compliance: bundle.compliance });
  },
  setNafCode: (nafCode) => {
    set({ nafCode });
    get().refresh();
  },
  setUnits: (units) => {
    set({ units });
    get().refresh();
  },
}));
