import { create } from "zustand";
import { persist } from "zustand/middleware";
import { riskLibrary } from "../data/riskLibrary";
import { ActionItem, Assessment, Establishment, Hazard, Priority, WorkUnit, VersionEntry } from "../types";
import { computePriority } from "../utils/score";
import { uid } from "../utils/uid";
import { makeActionForAssessment } from "../services/actionCatalogService";
import { buildPrefillData } from "../services/prefillService";
import {
  loadAll, pushAll,
  upsertEstablishment, deleteEstablishment,
  upsertWorkUnit, deleteWorkUnit,
  upsertAssessment, deleteAssessment,
  upsertAction, deleteAction,
  upsertVersion,
} from "../services/supabaseSync";

type AssessmentInput = {
  workUnitId: string;
  hazardId: string;
  existingMeasures?: string;
  proposedMeasures?: string;
  gravity: number;
  frequency: number;
  control: number;
};

type ActionInput = Omit<ActionItem, "id" | "createdAt" | "priority"> & { priority?: Priority };

interface DUERPState {
  // Supabase
  orgId: string | null;
  syncStatus: "idle" | "syncing" | "error";
  setOrgId: (id: string) => void;
  loadFromSupabase: (orgId: string) => Promise<void>;

  // Data
  establishments: Establishment[];
  workUnits: WorkUnit[];
  hazardLibrary: Hazard[];
  assessments: Assessment[];
  actions: ActionItem[];
  versions: VersionEntry[];
  selectedEstablishmentId?: string;
  selectedWorkUnitId?: string;

  // Actions
  setSelectedEstablishment: (id: string) => void;
  setSelectedWorkUnit: (id: string) => void;
  addEstablishment: (payload: Establishment) => void;
  removeEstablishment: (id: string) => void;
  addWorkUnit: (payload: WorkUnit) => void;
  removeWorkUnit: (id: string) => void;
  addHazard: (payload: Hazard) => void;
  addAssessment: (payload: AssessmentInput) => void;
  removeAssessment: (id: string) => void;
  updateAssessment: (id: string, payload: Partial<AssessmentInput>) => void;
  addAction: (payload: ActionInput) => void;
  removeAction: (id: string) => void;
  updateAction: (id: string, payload: Partial<ActionItem>) => void;
  updateActionStatus: (id: string, status: ActionItem["status"]) => void;
  toggleActionStep: (actionId: string, stepId: string) => void;
  createVersion: (label: string, reason?: string) => void;
  loadingHazards: boolean;
  prefillFromSector: (sector?: string) => Promise<void>;
  // Non-null quand le dernier préremplissage a dû se rabattre sur la bibliothèque
  // générique (catalogue distant/Supabase indisponible) plutôt qu'une analyse
  // ciblée par secteur NAF — permet à l'UI de le signaler au lieu de rester muette.
  prefillWarning: string | null;
  dismissPrefillWarning: () => void;
  // Charge un établissement fictif pré-rempli, pour laisser visiter l'app
  // avant de s'engager à créer ses propres données.
  loadDemoData: () => void;
}

const sync = (fn: () => void) => {
  try { fn(); } catch { /* fire-and-forget, never crash */ }
};

export const useDuerpStore = create<DUERPState>()(
  persist(
    (set, get) => ({
      orgId: null,
      syncStatus: "idle",

      setOrgId: (id) => set({ orgId: id }),

      loadFromSupabase: async (orgId) => {
        set({ syncStatus: "syncing" });
        try {
          const remote = await loadAll(orgId);

          if (!remote) {
            set({ syncStatus: "error" });
            return;
          }

          const hasRemoteData = remote.establishments.length > 0;
          const state = get();
          const hasLocalData = state.establishments.length > 0;

          if (hasRemoteData) {
            // Remote wins — hydrate store from Supabase
            set({
              establishments: remote.establishments,
              workUnits: remote.workUnits,
              assessments: remote.assessments,
              actions: remote.actions,
              versions: remote.versions,
              selectedEstablishmentId: remote.establishments[0]?.id,
              selectedWorkUnitId: remote.workUnits[0]?.id,
              syncStatus: "idle",
            });
          } else if (hasLocalData) {
            // Migration : localStorage → Supabase
            await pushAll(orgId, {
              establishments: state.establishments,
              workUnits: state.workUnits,
              assessments: state.assessments,
              actions: state.actions,
              versions: state.versions,
            });
            set({ syncStatus: "idle" });
          } else {
            set({ syncStatus: "idle" });
          }
        } catch {
          set({ syncStatus: "error" });
        }
      },

      establishments: [],
      workUnits: [],
      hazardLibrary: riskLibrary,
      assessments: [],
      actions: [],
      versions: [],
      selectedEstablishmentId: undefined,
      selectedWorkUnitId: undefined,
      loadingHazards: false,

      setSelectedEstablishment: (id) =>
        set(() => ({
          selectedEstablishmentId: id,
          selectedWorkUnitId: get().workUnits.find((u) => u.establishmentId === id)?.id,
        })),

      setSelectedWorkUnit: (id) => set(() => ({ selectedWorkUnitId: id })),

      addEstablishment: (payload) => {
        set((state) => ({
          establishments: [...state.establishments, payload],
          selectedEstablishmentId: payload.id,
        }));
        const { orgId } = get();
        if (orgId) sync(() => upsertEstablishment(orgId, payload));
      },

      removeEstablishment: (id) => {
        const state = get();
        const workUnits = state.workUnits.filter((w) => w.establishmentId !== id);
        const workUnitIds = new Set(workUnits.map((w) => w.id));
        const assessments = state.assessments.filter((a) => workUnitIds.has(a.workUnitId));
        const assessmentIds = new Set(assessments.map((a) => a.id));
        const actions = state.actions.filter((a) => !a.assessmentId || assessmentIds.has(a.assessmentId));
        const establishments = state.establishments.filter((e) => e.id !== id);
        const selectedEstablishmentId = establishments[0]?.id;
        const selectedWorkUnitId = workUnits.find((w) => w.establishmentId === selectedEstablishmentId)?.id;
        set({ establishments, workUnits, assessments, actions, selectedEstablishmentId, selectedWorkUnitId });

        const { orgId } = get();
        if (orgId) sync(() => deleteEstablishment(orgId, id));
      },

      addWorkUnit: (payload) => {
        set((state) => ({
          workUnits: [...state.workUnits, payload],
          selectedWorkUnitId: payload.id,
        }));
        const { orgId } = get();
        if (orgId) sync(() => upsertWorkUnit(orgId, payload));
      },

      removeWorkUnit: (id) => {
        const state = get();
        const workUnits = state.workUnits.filter((w) => w.id !== id);
        const assessments = state.assessments.filter((a) => a.workUnitId !== id);
        const assessmentIds = new Set(assessments.map((a) => a.id));
        const actions = state.actions.filter((a) => !a.assessmentId || assessmentIds.has(a.assessmentId));
        const selectedWorkUnitId = workUnits.find((w) => w.establishmentId === state.selectedEstablishmentId)?.id;
        set({ workUnits, assessments, actions, selectedWorkUnitId });

        const { orgId } = get();
        if (orgId) sync(() => deleteWorkUnit(orgId, id));
      },

      addHazard: (payload) =>
        set((state) => {
          const map = new Map(state.hazardLibrary.map((h) => [h.id || `haz-${h.risk}`, h]));
          const safeId = payload.id || `haz-${payload.risk.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
          map.set(safeId, { ...payload, id: safeId });
          return { ...state, hazardLibrary: Array.from(map.values()) };
        }),

      addAssessment: (payload) => {
        const state = get();
        const workUnit = state.workUnits.find((w) => w.id === payload.workUnitId);
        const establishmentId = workUnit?.establishmentId || state.selectedEstablishmentId;
        const hazard = state.hazardLibrary.find((h) => h.id === payload.hazardId);
        if (!hazard) return;
        const score = payload.gravity * payload.frequency / Math.max(payload.control, 0.5);
        const priority = computePriority(score);
        const now = new Date().toISOString();
        const newAssessment: Assessment = {
          id: uid(),
          workUnitId: payload.workUnitId,
          hazardId: hazard.id,
          hazardCategory: hazard.category,
          riskLabel: hazard.risk,
          damages: hazard.damages,
          existingMeasures: payload.existingMeasures,
          proposedMeasures: payload.proposedMeasures,
          gravity: payload.gravity,
          frequency: payload.frequency,
          control: payload.control,
          score,
          priority,
          createdAt: now,
          updatedAt: now,
        };
        const newAction = makeActionForAssessment(newAssessment, establishmentId);
        const actions = state.actions.some((act) => act.assessmentId === newAssessment.id)
          ? state.actions
          : [...state.actions, newAction];
        set({ assessments: [...state.assessments, newAssessment], actions });

        const { orgId } = get();
        if (orgId) {
          sync(() => upsertAssessment(orgId, newAssessment));
          if (!state.actions.some((act) => act.assessmentId === newAssessment.id)) {
            sync(() => upsertAction(orgId, newAction));
          }
        }
      },

      removeAssessment: (id) => {
        set((state) => ({
          assessments: state.assessments.filter((a) => a.id !== id),
          actions: state.actions.filter((a) => a.assessmentId !== id),
        }));
        const { orgId } = get();
        if (orgId) sync(() => deleteAssessment(orgId, id));
      },

      updateAssessment: (id, payload) => {
        set((state) => ({
          assessments: state.assessments.map((a) => {
            if (a.id !== id) return a;
            const gravity = payload.gravity ?? a.gravity;
            const frequency = payload.frequency ?? a.frequency;
            const control = payload.control ?? a.control;
            const score = gravity * frequency / Math.max(control, 0.5);
            return { ...a, ...payload, gravity, frequency, control, score, priority: computePriority(score), updatedAt: new Date().toISOString() };
          }),
        }));
        const { orgId, assessments } = get();
        if (orgId) {
          const updated = assessments.find((a) => a.id === id);
          if (updated) sync(() => upsertAssessment(orgId, updated));
        }
      },

      addAction: (payload) => {
        const state = get();
        const newAction: ActionItem = {
          ...payload,
          id: uid(),
          createdAt: new Date().toISOString(),
          priority: payload.priority ?? (payload.assessmentId ? state.assessments.find((a) => a.id === payload.assessmentId)?.priority ?? 4 : 4),
        };
        set({ actions: [...state.actions, newAction] });
        const { orgId } = get();
        if (orgId) sync(() => upsertAction(orgId, newAction));
      },

      removeAction: (id) => {
        set((state) => ({ actions: state.actions.filter((a) => a.id !== id) }));
        const { orgId } = get();
        if (orgId) sync(() => deleteAction(orgId, id));
      },

      updateAction: (id, payload) => {
        const now = Date.now();
        set((state) => ({
          actions: state.actions.map((a) => {
            if (a.id !== id) return a;
            const next = { ...a, ...payload };
            let status = next.status;
            if (payload.steps && payload.steps.length > 0) {
              const doneCount = payload.steps.filter((s) => s.done).length;
              status = doneCount === 0 ? "TO_DO" : doneCount === payload.steps.length ? "DONE" : "IN_PROGRESS";
            }
            const endTime = next.endDate ? new Date(next.endDate).getTime() : undefined;
            return { ...next, status: endTime !== undefined && endTime < now && status !== "DONE" ? "LATE" : status };
          }),
        }));
        const { orgId, actions } = get();
        if (orgId) {
          const updated = actions.find((a) => a.id === id);
          if (updated) sync(() => upsertAction(orgId, updated));
        }
      },

      updateActionStatus: (id, status) => {
        const now = Date.now();
        set((state) => ({
          actions: state.actions.map((a) => {
            if (a.id !== id) return a;
            const endTime = a.endDate ? new Date(a.endDate).getTime() : undefined;
            return { ...a, status: endTime !== undefined && endTime < now && status !== "DONE" ? "LATE" : status };
          }),
        }));
        const { orgId, actions } = get();
        if (orgId) {
          const updated = actions.find((a) => a.id === id);
          if (updated) sync(() => upsertAction(orgId, updated));
        }
      },

      toggleActionStep: (actionId, stepId) => {
        const now = Date.now();
        set((state) => ({
          actions: state.actions.map((a) => {
            if (a.id !== actionId) return a;
            const steps = a.steps?.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)) || [];
            let status = a.status;
            if (steps.length > 0) {
              const doneCount = steps.filter((s) => s.done).length;
              status = doneCount === 0 ? "TO_DO" : doneCount === steps.length ? "DONE" : "IN_PROGRESS";
            }
            const endTime = a.endDate ? new Date(a.endDate).getTime() : undefined;
            return { ...a, steps, status: endTime !== undefined && endTime < now && status !== "DONE" ? "LATE" : status };
          }),
        }));
        const { orgId, actions } = get();
        if (orgId) {
          const updated = actions.find((a) => a.id === actionId);
          if (updated) sync(() => upsertAction(orgId, updated));
        }
      },

      createVersion: (label, reason) => {
        const state = get();
        const establishmentId = state.selectedEstablishmentId || state.establishments[0].id;
        const workUnits = state.workUnits.filter((u) => u.establishmentId === establishmentId);
        const workUnitIds = new Set(workUnits.map((u) => u.id));
        const assessments = state.assessments.filter((a) => workUnitIds.has(a.workUnitId));
        const assessmentIds = new Set(assessments.map((a) => a.id));
        const actions = state.actions.filter(
          (a) => a.establishmentId === establishmentId || (a.assessmentId && assessmentIds.has(a.assessmentId))
        );
        const newVersion: VersionEntry = {
          id: uid(),
          establishmentId,
          label,
          reason,
          hash: btoa(JSON.stringify(assessments)).slice(0, 18),
          createdAt: new Date().toISOString(),
          // Instantané complet et immuable : permet de reconstituer le DUERP tel qu'il
          // était à cette date (obligation légale), indépendamment des modifications
          // ultérieures des unités/risques/actions ou du catalogue.
          snapshot: { workUnits, assessments, actions },
        };
        set({ versions: [...state.versions, newVersion] });
        const { orgId } = get();
        if (orgId) sync(() => upsertVersion(orgId, newVersion));
      },

      prefillFromSector: async (sector) => {
        const state = get();
        const establishment = state.establishments.find((e) => e.id === state.selectedEstablishmentId);
        const naf = establishment?.codeNaf;
        if (!sector && !naf) return;
        const targetWorkUnitId = state.selectedWorkUnitId;
        const allUnits = state.workUnits.filter((u) => u.establishmentId === state.selectedEstablishmentId);
        const targetUnits = targetWorkUnitId ? allUnits.filter((u) => u.id === targetWorkUnitId) : allUnits;
        if (!targetUnits.length) {
          set({
            prefillWarning: "Créez d'abord une unité de travail (menu « Unités de travail ») avant de pré-remplir les risques — chaque risque doit être rattaché à une unité.",
          });
          return;
        }

        set({ loadingHazards: true });
        try {
          const { usedGenericFallback, ...result } = await buildPrefillData(naf, sector, targetUnits, state.hazardLibrary, state.assessments, state.actions, state.selectedEstablishmentId);
          set({
            ...result,
            prefillWarning: usedGenericFallback
              ? "Aucun risque spécifique à votre secteur trouvé : liste générique proposée ci-dessous, à affiner manuellement."
              : null,
          });
          // Sync new assessments + actions vers l'API (Neon)
          const { orgId } = get();
          if (orgId) {
            result.assessments?.forEach((a) => sync(() => upsertAssessment(orgId, a)));
            result.actions?.forEach((a) => sync(() => upsertAction(orgId, a)));
          }
        } finally {
          set({ loadingHazards: false });
        }
      },

      prefillWarning: null,
      dismissPrefillWarning: () => set({ prefillWarning: null }),

      loadDemoData: () => {
        const estId = "demo-est-1";
        const unitFournilId = "demo-unit-fournil";
        const unitVenteId = "demo-unit-vente";
        const now = new Date().toISOString();
        const establishments: Establishment[] = [
          {
            id: estId,
            name: "Boulangerie Dupont (exemple)",
            siret: "12345678900011",
            codeNaf: "10.71C",
            sector: "Boulangerie-pâtisserie",
            address: "12 rue de la République, 69002 Lyon",
            headcount: 4,
          },
        ];
        const workUnits: WorkUnit[] = [
          { id: unitFournilId, establishmentId: estId, name: "Fournil", activity: "Production", features: ["vibrating_tools", "cold_room"] },
          { id: unitVenteId, establishmentId: estId, name: "Vente / Accueil", activity: "Vente au comptoir", features: ["public_facing"] },
        ];
        const mkAssessment = (a: Omit<Assessment, "score" | "priority" | "createdAt" | "updatedAt">): Assessment => {
          const score = a.gravity * a.frequency / Math.max(a.control, 0.5);
          return { ...a, score, priority: computePriority(score), createdAt: now, updatedAt: now };
        };
        const brulure = mkAssessment({ id: uid(), workUnitId: unitFournilId, hazardId: "haz-brulure", hazardCategory: "Risque thermique", riskLabel: "Brûlure au contact du four", damages: "Brûlure cutanée", existingMeasures: "Gants isolants fournis, procédure d'ouverture du four affichée", proposedMeasures: "", gravity: 6, frequency: 7, control: 5 });
        const manutention = mkAssessment({ id: uid(), workUnitId: unitFournilId, hazardId: "haz-tms", hazardCategory: "TMS", riskLabel: "Manutention de sacs de farine (25 kg)", damages: "Lombalgie, troubles musculo-squelettiques", existingMeasures: "", proposedMeasures: "Diable de manutention, formation gestes et postures", gravity: 5, frequency: 6, control: 1 });
        const coupure = mkAssessment({ id: uid(), workUnitId: unitFournilId, hazardId: "haz-coupure", hazardCategory: "Risque mécanique", riskLabel: "Coupure au trancheur à pain", damages: "Coupure, amputation partielle", existingMeasures: "Carter de protection, arrêt d'urgence", proposedMeasures: "", gravity: 8, frequency: 3, control: 6 });
        const atex = mkAssessment({ id: uid(), workUnitId: unitFournilId, hazardId: "haz-atex", hazardCategory: "Risque incendie / explosion", riskLabel: "Explosion de poussières de farine (atmosphère explosive)", damages: "Brûlures graves, explosion, décès possible", existingMeasures: "Nettoyage quotidien du fournil", proposedMeasures: "Zonage ATEX, aspiration centralisée des poussières, suppression des sources d'inflammation", gravity: 10, frequency: 4, control: 0.5 });
        const chimique = mkAssessment({ id: uid(), workUnitId: unitFournilId, hazardId: "haz-chimique", hazardCategory: "Risque chimique", riskLabel: "Exposition aux produits de nettoyage et désinfection", damages: "Irritation cutanée, respiratoire, brûlure chimique", existingMeasures: "", proposedMeasures: "Fiches de données de sécurité affichées, gants et lunettes, amélioration de la ventilation", gravity: 8, frequency: 7, control: 1 });
        const bruit = mkAssessment({ id: uid(), workUnitId: unitFournilId, hazardId: "haz-bruit", hazardCategory: "Risque physique", riskLabel: "Bruit (pétrin, four, hotte d'extraction)", damages: "Fatigue auditive, à terme surdité professionnelle", existingMeasures: "", proposedMeasures: "Mesurage sonométrique, protections auditives si seuil dépassé", gravity: 4, frequency: 6, control: 2 });
        const electrique = mkAssessment({ id: uid(), workUnitId: unitFournilId, hazardId: "haz-electrique", hazardCategory: "Risque électrique", riskLabel: "Défaut électrique (armoire four, pétrin)", damages: "Électrisation, électrocution", existingMeasures: "Contrôle électrique annuel par organisme agréé", proposedMeasures: "", gravity: 7, frequency: 2, control: 6 });
        const agression = mkAssessment({ id: uid(), workUnitId: unitVenteId, hazardId: "haz-agression", hazardCategory: "Risque psychosocial", riskLabel: "Agression verbale ou physique de la clientèle", damages: "Stress, mal-être au travail, traumatisme", existingMeasures: "", proposedMeasures: "Formation gestion des conflits, procédure d'alerte", gravity: 5, frequency: 5, control: 1 });
        const chute = mkAssessment({ id: uid(), workUnitId: unitVenteId, hazardId: "haz-chute", hazardCategory: "Risques pour la sécurité (accidents)", riskLabel: "Chute de plain-pied", damages: "Entorse, fracture", existingMeasures: "Sol antidérapant en zone de vente", proposedMeasures: "", gravity: 5, frequency: 3, control: 6 });
        const ergonomie = mkAssessment({ id: uid(), workUnitId: unitVenteId, hazardId: "haz-station-debout", hazardCategory: "TMS", riskLabel: "Station debout prolongée au comptoir", damages: "Troubles posturaux, jambes lourdes, TMS", existingMeasures: "", proposedMeasures: "Tapis anti-fatigue, assise assis-debout, pauses régulières", gravity: 4, frequency: 7, control: 1 });
        const assessments: Assessment[] = [brulure, manutention, coupure, atex, chimique, bruit, electrique, agression, chute, ergonomie];

        const mkAction = (a: Omit<ActionItem, "createdAt">): ActionItem => ({ ...a, createdAt: now });
        const actions: ActionItem[] = [
          mkAction({ id: uid(), establishmentId: estId, assessmentId: atex.id, title: "Mettre en place un zonage ATEX et une aspiration centralisée des poussières", description: "Réduire le risque d'explosion lié aux poussières de farine en suspension dans le fournil.", owner: "M. Dupont", startDate: "2026-08-01", endDate: "2026-09-15", dueDate: "2026-09-15", status: "TO_DO", priority: atex.priority, steps: [
            { id: uid(), label: "Faire réaliser un diagnostic ATEX par un organisme agréé", done: false },
            { id: uid(), label: "Installer un système d'aspiration centralisée au fournil", done: false },
            { id: uid(), label: "Former l'équipe aux zones à risque d'explosion", done: false },
          ] }),
          mkAction({ id: uid(), establishmentId: estId, assessmentId: chimique.id, title: "Sécuriser l'usage des produits de nettoyage et désinfection", description: "Limiter l'exposition cutanée et respiratoire aux produits chimiques utilisés quotidiennement.", owner: "Mme Dupont", startDate: "2026-08-10", endDate: "2026-09-01", dueDate: "2026-09-01", status: "IN_PROGRESS", priority: chimique.priority, steps: [
            { id: uid(), label: "Afficher les fiches de données de sécurité (FDS)", done: true },
            { id: uid(), label: "Équiper le poste de gants et lunettes de protection", done: false },
            { id: uid(), label: "Améliorer la ventilation de la zone de nettoyage", done: false },
          ] }),
          mkAction({ id: uid(), establishmentId: estId, assessmentId: manutention.id, title: "Acheter un diable de manutention pour les sacs de farine", description: "Réduire les manipulations manuelles de sacs de 25 kg à l'origine de troubles musculo-squelettiques.", owner: "M. Dupont", startDate: "2026-08-05", endDate: "2026-09-01", dueDate: "2026-09-01", status: "TO_DO", priority: manutention.priority, steps: [
            { id: uid(), label: "Comparer les modèles adaptés aux sacs de 25 kg", done: false },
            { id: uid(), label: "Commander l'équipement", done: false },
            { id: uid(), label: "Former l'équipe à son utilisation", done: false },
          ] }),
          mkAction({ id: uid(), establishmentId: estId, assessmentId: agression.id, title: "Former l'équipe vente à la gestion des conflits", description: "Donner à l'équipe au contact de la clientèle des outils pour désamorcer les situations tendues.", owner: "Mme Dupont", startDate: "2026-09-01", endDate: "2026-10-15", dueDate: "2026-10-15", status: "IN_PROGRESS", priority: agression.priority, steps: [
            { id: uid(), label: "Identifier un organisme de formation", done: true },
            { id: uid(), label: "Planifier la session avec l'équipe", done: false },
            { id: uid(), label: "Mettre en place une procédure d'alerte", done: false },
          ] }),
          mkAction({ id: uid(), establishmentId: estId, assessmentId: ergonomie.id, title: "Aménager le poste de vente contre la station debout prolongée", description: "Limiter la fatigue posturale liée aux longues périodes debout au comptoir.", owner: "M. Dupont", startDate: "2026-09-15", endDate: "2026-11-01", dueDate: "2026-11-01", status: "TO_DO", priority: ergonomie.priority, steps: [
            { id: uid(), label: "Installer un tapis anti-fatigue", done: false },
            { id: uid(), label: "Mettre à disposition une assise assis-debout", done: false },
          ] }),
          mkAction({ id: uid(), establishmentId: estId, assessmentId: electrique.id, title: "Vérifier annuellement les installations électriques du fournil", description: "Contrôle réglementaire périodique des installations électriques du four et du pétrin.", owner: "M. Dupont", startDate: "2026-07-01", endDate: "2026-07-20", dueDate: "2026-07-20", status: "DONE", priority: electrique.priority, steps: [
            { id: uid(), label: "Faire intervenir un organisme agréé (Qualifelec)", done: true },
            { id: uid(), label: "Corriger les non-conformités relevées", done: true },
            { id: uid(), label: "Archiver le rapport de contrôle", done: true },
          ] }),
        ];
        set({
          establishments,
          workUnits,
          assessments,
          actions,
          selectedEstablishmentId: estId,
          selectedWorkUnitId: unitFournilId,
        });
      },
    }),
    {
      name: "kaijos-duerp-v1",
      partialize: (state) => ({
        establishments: state.establishments,
        workUnits: state.workUnits,
        hazardLibrary: state.hazardLibrary,
        assessments: state.assessments,
        actions: state.actions,
        versions: state.versions,
        selectedEstablishmentId: state.selectedEstablishmentId,
        selectedWorkUnitId: state.selectedWorkUnitId,
      }),
    }
  )
);
