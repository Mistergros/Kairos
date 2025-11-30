import { create } from 'zustand';
import { riskLibrary } from '../data/riskLibrary';
import {
  ActionItem,
  Assessment,
  Establishment,
  Hazard,
  Priority,
  WorkUnit,
  VersionEntry,
} from '../types';
import { computePriority } from '../utils/score';
import { fetchHazardsFromSources } from '../utils/api';

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 9)}`;

type AssessmentInput = {
  workUnitId: string;
  hazardId: string;
  existingMeasures?: string;
  proposedMeasures?: string;
  gravity: number;
  frequency: number;
  control: number;
};

type ActionInput = Omit<ActionItem, 'id' | 'createdAt' | 'priority'> & { priority?: Priority };

interface DUERPState {
  establishments: Establishment[];
  workUnits: WorkUnit[];
  hazardLibrary: Hazard[];
  assessments: Assessment[];
  actions: ActionItem[];
  versions: VersionEntry[];
  selectedEstablishmentId?: string;
  selectedWorkUnitId?: string;
  setSelectedEstablishment: (id: string) => void;
  setSelectedWorkUnit: (id: string) => void;
  addEstablishment: (payload: Establishment) => void;
  removeEstablishment: (id: string) => void;
  addWorkUnit: (payload: WorkUnit) => void;
  removeWorkUnit: (id: string) => void;
  addAssessment: (payload: AssessmentInput) => void;
  removeAssessment: (id: string) => void;
  updateAssessment: (id: string, payload: Partial<AssessmentInput>) => void;
  addAction: (payload: ActionInput) => void;
  updateActionStatus: (id: string, status: ActionItem['status']) => void;
  toggleActionStep: (actionId: string, stepId: string) => void;
  createVersion: (label: string, reason?: string) => void;
  loadingHazards: boolean;
  prefillFromSector: (sector?: string) => Promise<void>;
}

const initialEstablishment: Establishment = {
  id: uid(),
  name: 'Atelier Demo',
  sector: 'Tertiaire',
  codeNaf: '62.01Z',
  address: '12 rue du Progres, 75000 Paris',
  headcount: 45,
};

const initialUnits: WorkUnit[] = [
  { id: uid(), establishmentId: initialEstablishment.id, name: 'Bureaux', headcount: 30 },
  { id: uid(), establishmentId: initialEstablishment.id, name: 'Atelier', headcount: 15 },
];

const seedAssessment = (workUnitId: string, hazardId: string, gravity: number, frequency: number, control: number) => {
  const hazard = riskLibrary.find((h) => h.id === hazardId)!;
  const score = gravity * frequency * control;
  const priority = computePriority(score);
  return {
    id: uid(),
    workUnitId,
    hazardId,
    hazardCategory: hazard.category,
    riskLabel: hazard.risk,
    damages: hazard.damages,
    gravity,
    frequency,
    control,
    score,
    priority,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies Assessment;
};

const initialAssessments: Assessment[] = [
  seedAssessment(initialUnits[0].id, riskLibrary[0].id, 7, 3, 0.5),
  seedAssessment(initialUnits[1].id, riskLibrary[12].id, 10, 7, 1),
];

export const useDuerpStore = create<DUERPState>((set, get) => ({
  establishments: [initialEstablishment],
  workUnits: initialUnits,
  hazardLibrary: riskLibrary,
  assessments: initialAssessments,
  actions: [
    {
      id: uid(),
      establishmentId: initialEstablishment.id,
      assessmentId: initialAssessments[0].id,
      title: 'Installer aspiration localisee',
      description: "Limiter les emissions de solvants dans l'atelier.",
      steps: [
        { id: 'step-1', label: 'Valider fournisseur', done: false },
        { id: 'step-2', label: 'Commander materiel', done: false },
        { id: 'step-3', label: 'Installer et tester', done: false },
      ],
      owner: 'Responsable maintenance',
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      status: 'IN_PROGRESS',
      cost: 3500,
      priority: initialAssessments[0].priority,
      createdAt: new Date().toISOString(),
    },
  ],
  versions: [],
  selectedEstablishmentId: initialEstablishment.id,
  selectedWorkUnitId: initialUnits[0].id,
  loadingHazards: false,

  setSelectedEstablishment: (id) =>
    set(() => ({
      selectedEstablishmentId: id,
      selectedWorkUnitId: get().workUnits.find((u) => u.establishmentId === id)?.id,
    })),

  setSelectedWorkUnit: (id) => set(() => ({ selectedWorkUnitId: id })),

  addEstablishment: (payload) =>
    set((state) => ({
      establishments: [...state.establishments, payload],
      selectedEstablishmentId: payload.id,
    })),

  removeEstablishment: (id) =>
    set((state) => {
      const establishments = state.establishments.filter((e) => e.id !== id);
      const workUnits = state.workUnits.filter((w) => w.establishmentId !== id);
      const workUnitIds = new Set(workUnits.map((w) => w.id));
      const assessments = state.assessments.filter((a) => workUnitIds.has(a.workUnitId));
      const assessmentIds = new Set(assessments.map((a) => a.id));
      const actions = state.actions.filter((a) => !a.assessmentId || assessmentIds.has(a.assessmentId));
      const selectedEstablishmentId = establishments[0]?.id;
      const selectedWorkUnitId = workUnits.find((w) => w.establishmentId === selectedEstablishmentId)?.id;
      return {
        establishments,
        workUnits,
        assessments,
        actions,
        selectedEstablishmentId,
        selectedWorkUnitId,
      };
    }),

  addWorkUnit: (payload) =>
    set((state) => ({
      workUnits: [...state.workUnits, payload],
      selectedWorkUnitId: payload.id,
    })),

  removeWorkUnit: (id) =>
    set((state) => {
      const workUnits = state.workUnits.filter((w) => w.id !== id);
      const assessments = state.assessments.filter((a) => a.workUnitId !== id);
      const assessmentIds = new Set(assessments.map((a) => a.id));
      const actions = state.actions.filter((a) => !a.assessmentId || assessmentIds.has(a.assessmentId));
      const selectedWorkUnitId = workUnits.find((w) => w.establishmentId === state.selectedEstablishmentId)?.id;
      return { ...state, workUnits, assessments, actions, selectedWorkUnitId };
    }),

  addAssessment: (payload) =>
    set((state) => {
      const hazard = state.hazardLibrary.find((h) => h.id === payload.hazardId);
      if (!hazard) return state;
      const score = payload.gravity * payload.frequency * payload.control;
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
      return { ...state, assessments: [...state.assessments, newAssessment] };
    }),

  removeAssessment: (id) =>
    set((state) => {
      const assessments = state.assessments.filter((a) => a.id !== id);
      const actions = state.actions.filter((a) => a.assessmentId !== id);
      return { ...state, assessments, actions };
    }),

  updateAssessment: (id, payload) =>
    set((state) => {
      const next = state.assessments.map((a) => {
        if (a.id !== id) return a;
        const gravity = payload.gravity ?? a.gravity;
        const frequency = payload.frequency ?? a.frequency;
        const control = payload.control ?? a.control;
        const score = gravity * frequency * control;
        return {
          ...a,
          ...payload,
          gravity,
          frequency,
          control,
          score,
          priority: computePriority(score),
          updatedAt: new Date().toISOString(),
        };
      });
      return { ...state, assessments: next };
    }),

  addAction: (payload) =>
    set((state) => ({
      actions: [
        ...state.actions,
        {
          ...payload,
          id: uid(),
          createdAt: new Date().toISOString(),
          priority:
            payload.priority ??
            (payload.assessmentId
              ? state.assessments.find((a) => a.id === payload.assessmentId)?.priority ?? 4
              : 4),
        },
      ],
    })),

  updateActionStatus: (id, status) =>
    set((state) => ({
      actions: state.actions.map((a) => (a.id === id ? { ...a, status } : a)),
    })),

  toggleActionStep: (actionId, stepId) =>
    set((state) => ({
      actions: state.actions.map((a) =>
        a.id === actionId
          ? { ...a, steps: a.steps?.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)) }
          : a
      ),
    })),

  createVersion: (label, reason) =>
    set((state) => ({
      versions: [
        ...state.versions,
        {
          id: uid(),
          establishmentId: state.selectedEstablishmentId || state.establishments[0].id,
          label,
          reason,
          hash: btoa(JSON.stringify(state.assessments)).slice(0, 18),
          createdAt: new Date().toISOString(),
        },
      ],
    })),

  prefillFromSector: async (sector) => {
    const establishment = get().establishments.find((e) => e.id === get().selectedEstablishmentId);
    const naf = establishment?.codeNaf;
    if (!sector && !naf) return;
    set(() => ({ loadingHazards: true }));
    try {
      const fetched = await fetchHazardsFromSources(sector, naf);
      const hazardMap = new Map<string, Hazard>();
      const existingLibrary = get().hazardLibrary;
      [...existingLibrary, ...fetched].forEach((h) => {
        const safeId = h.id || `haz-${h.risk.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        hazardMap.set(safeId, { ...h, id: safeId });
      });
      const hazardLibrary = Array.from(hazardMap.values());

      const targetEstablishment = get().selectedEstablishmentId || get().establishments[0]?.id;
      const targetUnits = get().workUnits.filter((u) => u.establishmentId === targetEstablishment);
      const existingByUnit = get().assessments.reduce((acc, a) => {
        acc[a.workUnitId] = acc[a.workUnitId] || new Set<string>();
        acc[a.workUnitId].add(a.hazardId);
        return acc;
      }, {} as Record<string, Set<string>>);

      const assessmentsToAdd: Assessment[] = [];
      targetUnits.forEach((unit) => {
        const currentIds = existingByUnit[unit.id] || new Set<string>();
        hazardLibrary
          .filter((h) => !currentIds.has(h.id))
          .slice(0, 6)
          .forEach((h) => {
            const gravity = 7;
            const frequency = 3;
            const control = 0.5;
            const score = gravity * frequency * control;
            assessmentsToAdd.push({
              id: uid(),
              workUnitId: unit.id,
              hazardId: h.id,
              hazardCategory: h.category,
              riskLabel: h.risk,
              damages: h.damages,
              existingMeasures: undefined,
              proposedMeasures: h.example_prevention,
              gravity,
              frequency,
              control,
              score,
              priority: computePriority(score),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          });
      });

      set((state) => ({
        hazardLibrary,
        assessments: [...state.assessments, ...assessmentsToAdd],
      }));
    } finally {
      set(() => ({ loadingHazards: false }));
    }
  },
}));







