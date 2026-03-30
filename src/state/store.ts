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
            const endTime = next.endDate ? new Date(next.endDate).getTime() : undefined;
            return { ...next, status: endTime !== undefined && endTime < now && next.status !== "DONE" ? "LATE" : next.status };
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
        set((state) => ({
          actions: state.actions.map((a) =>
            a.id === actionId
              ? { ...a, steps: a.steps?.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)) }
              : a
          ),
        }));
        const { orgId, actions } = get();
        if (orgId) {
          const updated = actions.find((a) => a.id === actionId);
          if (updated) sync(() => upsertAction(orgId, updated));
        }
      },

      createVersion: (label, reason) => {
        const state = get();
        const newVersion: VersionEntry = {
          id: uid(),
          establishmentId: state.selectedEstablishmentId || state.establishments[0].id,
          label,
          reason,
          hash: btoa(JSON.stringify(state.assessments)).slice(0, 18),
          createdAt: new Date().toISOString(),
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
        if (!targetUnits.length) return;

        set({ loadingHazards: true });
        try {
          const result = await buildPrefillData(naf, sector, targetUnits, state.hazardLibrary, state.assessments, state.actions, state.selectedEstablishmentId);
          set(result);
          // Sync new assessments + actions to Supabase
          const { orgId } = get();
          if (orgId) {
            result.assessments?.forEach((a) => sync(() => upsertAssessment(orgId, a)));
            result.actions?.forEach((a) => sync(() => upsertAction(orgId, a)));
          }
        } finally {
          set({ loadingHazards: false });
        }
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
