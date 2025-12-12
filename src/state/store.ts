import { create } from "zustand";
import { riskLibrary } from "../data/riskLibrary";
import actionsCatalog from "../../config/actions.catalog.json";
import { nafPresets, NafPreset } from "../data/nafPresets";
import { buildHazardsFromMapping } from "../data/nafMappingLoader";
import { ActionItem, Assessment, Establishment, Hazard, Priority, WorkUnit, VersionEntry } from "../types";
import { computePriority } from "../utils/score";
import { fetchHazardsFromSources } from "../utils/api";
import { RiskEngineV3 } from "../core/engine/risk-engine.v3";
import duerpApi from "../services/duerpApi";

// Sector presets (ASCII labels to avoid encoding issues)
const itHazards: Hazard[] = [
  { id: "it-ecran", category: "Travail sur ecran", risk: "Postes mal ajustes", damages: "TMS, fatigue visuelle", example_prevention: "Ergonomie poste, pauses, alternance taches", sector: "Informatique" },
  { id: "it-rps", category: "Risques psychosociaux (RPS)", risk: "Charge mentale / pression client", damages: "Stress, epuisement", example_prevention: "Planification, priorisation, rituels equipe", sector: "Informatique" },
  { id: "it-posture", category: "Postures de travail", risk: "Station assise prolongee", damages: "Lombalgies, TMS", example_prevention: "Assis-debout, pauses actives, ergonomie", sector: "Informatique" },
  { id: "it-elec", category: "Risque electrique", risk: "Multiprises, baies serveurs", damages: "Incendie, electrocution", example_prevention: "Prises aux normes, parasurtenseurs, maintenance", sector: "Informatique" },
];

const consultingHazards: Hazard[] = [
  { id: "consult-rps", category: "Risques psychosociaux (RPS)", risk: "Charge mentale, delais", damages: "Stress, epuisement", example_prevention: "Planification realiste, priorisation, soutien manager", sector: "Conseil" },
  { id: "consult-ecran", category: "Travail sur ecran", risk: "Postes fixes mal amenages", damages: "TMS, fatigue visuelle", example_prevention: "Ecran hauteur yeux, pauses, reglage siege", sector: "Conseil" },
  { id: "consult-deplacement", category: "Risque routier", risk: "Deplacements chez clients", damages: "Accident, fatigue", example_prevention: "Marge planning, politique trajets, entretien vehicule", sector: "Conseil" },
];

const btpHazards: Hazard[] = [
  { id: "btp-chute", category: "Chutes (plain-pied / hauteur)", risk: "Travaux en hauteur / echafaudage", damages: "Chute de hauteur, fractures", example_prevention: "Garde-corps, harnais, controle echafaudage", sector: "BTP" },
  { id: "btp-engins", category: "Manutention mecanique / engins", risk: "Circulation engins", damages: "Collision, ecrasement", example_prevention: "Plan de circulation, balisage, VGP", sector: "BTP" },
  { id: "btp-poussiere", category: "Risque toxique / chimique", risk: "Poussieres (silice, ciment)", damages: "Irritation, pathologies respiratoires", example_prevention: "Aspiration a la source, arrosage, FFP2/3", sector: "BTP" },
];

const medicoHazards: Hazard[] = [
  { id: "medico-bio", category: "Biologique", risk: "Contact agents infectieux", damages: "Infection, zoonose", example_prevention: "Vaccination, hygiene, EPI", sector: "Medico-social" },
  { id: "medico-transfert", category: "Manutention manuelle", risk: "Transfert personnes dependantes", damages: "TMS, chute patient", example_prevention: "Leve-personnes, binome, formation gestes", sector: "Medico-social" },
  { id: "medico-rps", category: "Risques psychosociaux (RPS)", risk: "Charge emotionnelle", damages: "Stress, epuisement", example_prevention: "Supervision, regulation, effectifs adaptes", sector: "Medico-social" },
];

const logistiqueHazards: Hazard[] = [
  { id: "logi-chariot", category: "Manutention mecanique / engins", risk: "Chariots en allees etroites", damages: "Collision, chute de charge", example_prevention: "CACES, miroirs, limitation vitesse", sector: "Logistique" },
  { id: "logi-manuelle", category: "Manutention manuelle", risk: "Prelevements et port repetes", damages: "TMS, lombalgies", example_prevention: "Aides manutention, rotation postes", sector: "Logistique" },
  { id: "logi-chute", category: "Chutes (plain-pied / hauteur)", risk: "Sols encombres, quais", damages: "Entorse, fracture", example_prevention: "Rangement, eclairage, EPI", sector: "Logistique" },
];

const agriHazards: Hazard[] = [
  { id: "agri-manuelle", category: "Manutention manuelle", risk: "Port de charges, gestes repetitifs", damages: "TMS, lombalgies", example_prevention: "Aides mecanisees, pauses, formation gestes", sector: "Agriculture" },
  { id: "agri-bio", category: "Biologique", risk: "Contact animaux/agents biologiques", damages: "Infection, allergie", example_prevention: "Vaccination, hygiene, EPI", sector: "Agriculture" },
  { id: "agri-machines", category: "Risque mecanique (machines/outils)", risk: "Outils/machines agricoles", damages: "Coupures, ecrasement", example_prevention: "Protections, formation, maintenance", sector: "Agriculture" },
];

const hospitalityHazards: Hazard[] = [
  { id: "host-chute", category: "Chutes (plain-pied / hauteur)", risk: "Sols glissants (cuisine, nettoyage)", damages: "Entorse, fracture", example_prevention: "Chaussures antiderapantes, signalisation", sector: "Hotellerie-Restauration" },
  { id: "host-brulure", category: "Risque thermique / chimique", risk: "Brulures (fours, produits)", damages: "Brulures, irritations", example_prevention: "EPI, procedures, rangement produits", sector: "Hotellerie-Restauration" },
  { id: "host-rps", category: "Risques psychosociaux (RPS)", risk: "Horaires decales, relation clientele", damages: "Stress, fatigue", example_prevention: "Planification, pauses, soutien managerial", sector: "Hotellerie-Restauration" },
];

const retailHazards: Hazard[] = [
  { id: "retail-chute", category: "Chutes (plain-pied / hauteur)", risk: "Sols encombres, rayonnages", damages: "Entorse, fracture", example_prevention: "Rangement, signalisation, EPI", sector: "Commerce" },
  { id: "retail-manuelle", category: "Manutention manuelle", risk: "Manutention colis/stock", damages: "TMS, lombalgies", example_prevention: "Aides manutention, formation gestes", sector: "Commerce" },
  { id: "retail-rps", category: "Risques psychosociaux (RPS)", risk: "Relation clientele difficile", damages: "Stress, choc emotionnel", example_prevention: "Formation gestion conflit, procedures", sector: "Commerce" },
];

const servicesProHazards: Hazard[] = [
  { id: "service-produit", category: "Risque toxique / chimique", risk: "Produits de nettoyage", damages: "Irritation, brulure", example_prevention: "Substitution, gants, ventilation", sector: "Services" },
  { id: "service-chute", category: "Chutes (plain-pied / hauteur)", risk: "Travail en hauteur/escabeau", damages: "Chute, entorse", example_prevention: "Escabeaux securises, formation, rangement", sector: "Services" },
  { id: "service-rps", category: "Risques psychosociaux (RPS)", risk: "Pression client, rythme eleve", damages: "Stress, fatigue", example_prevention: "Organisation, pauses, soutien equipe", sector: "Services" },
];

const transportHazards: Hazard[] = [
  { id: "transport-routier", category: "Risque routier", risk: "Temps de conduite prolonges", damages: "Accident, fatigue", example_prevention: "Planning, pauses, entretien vehicule", sector: "Transport" },
  { id: "transport-manuelle", category: "Manutention manuelle", risk: "Chargement/dechargement", damages: "TMS, chutes", example_prevention: "Aides mecanique, posture, EPI", sector: "Transport" },
  { id: "transport-chute", category: "Chutes (plain-pied / hauteur)", risk: "Montee/descente vehicules", damages: "Entorse, fracture", example_prevention: "Marchepieds, nettoyage, vigilance", sector: "Transport" },
];

const educationHazards: Hazard[] = [
  { id: "edu-rps", category: "Risques psychosociaux (RPS)", risk: "Tensions avec public", damages: "Stress, epuisement", example_prevention: "Mediation, soutien equipe, gestion classe", sector: "Education" },
  { id: "edu-chute", category: "Chutes (plain-pied / hauteur)", risk: "Deplacements, escaliers", damages: "Entorse, fracture", example_prevention: "Entretien sols, eclairage", sector: "Education" },
  { id: "edu-manuelle", category: "Manutention manuelle", risk: "Deplacement de mobilier/materiel", damages: "TMS, lombalgies", example_prevention: "Aides materiel, posture, binome", sector: "Education" },
];

const hazardByNafPrefix: Record<string, Hazard[]> = {
  "62": itHazards,
  "63": itHazards,
  "70": consultingHazards,
  "41": btpHazards,
  "42": btpHazards,
  "43": btpHazards,
  "49": transportHazards,
  "50": transportHazards,
  "51": transportHazards,
  "52": logistiqueHazards,
  "86": medicoHazards,
  "87": medicoHazards,
  "01": agriHazards,
  "02": agriHazards,
  "03": agriHazards,
  "55": hospitalityHazards,
  "56": hospitalityHazards,
  "45": retailHazards,
  "46": retailHazards,
  "47": retailHazards,
  "80": servicesProHazards,
  "81": servicesProHazards,
  "85": educationHazards,
};

type PresetHazard = Hazard & { gravity?: number; frequency?: number; control?: number };

// Lecture synchronisée (plus fiable que fetch côté client)
const loadNafPresets = async (): Promise<Record<string, NafPreset>> => nafPresets;

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2, 9)}`;

const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const labelToRiskId: Record<string, string> = {
  "atmospheres explosives": "r-atex",
  "incendie et evacuation": "r-incendie",
  "chutes de plain pied et de hauteur": "r-chute-hauteur",
  "machines et equipements de travail": "r-machine",
  "risque electrique": "r-electrique",
  "risque routier professionnel": "r-routier",
  "bruit": "r-bruit",
  "vibrations": "r-vibrations",
  "risques psychosociaux": "r-rps",
  "risques psychosociaux rps": "r-rps",
  "travail sur ecran": "r-ecran",
  "manutention manuelle": "r-manutention",
  "manutentions manuelles et tms": "r-manutention",
  "manutention manuelle et tms": "r-manutention",
  "agents chimiques dangereux": "r-chimique",
  "biologique": "r-bio",
  "glissades": "r-glissades",
  "travail de nuit": "r-night",
  "horaires atypiques travail de nuit": "r-night",
  "travail de nuit equipes alternantes": "r-night",
  "tms": "r-tms",
};

const categoryToRiskId: Record<string, string> = {
  "manutention manuelle": "r-manutention",
  "ergonomie": "r-tms",
  "organisation": "r-rps",
  "travail sur ecran": "r-ecran",
  "bruit": "r-bruit",
  "vibrations": "r-vibrations",
  "risques psychosociaux": "r-rps",
  "travail de nuit": "r-night",
};

type CatalogEntry = { risk_id?: string; title?: string; description?: string };

const actionsByRisk = (() => {
  const map = new Map<string, CatalogEntry[]>();
  (actionsCatalog as CatalogEntry[]).forEach((a) => {
    if (!a.risk_id) return;
    const key = normalize(a.risk_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  });
  return map;
})();

const pickCatalogAction = (assessment: Assessment) => {
  const label = normalize(assessment.riskLabel || "");
  const hazard = normalize(assessment.hazardId || "");
  const category = normalize(assessment.hazardCategory || "");

  const byId = hazard ? actionsByRisk.get(hazard) : undefined;
  if (byId?.length) return byId[0];

  const alias = labelToRiskId[label];
  const byAlias = alias ? actionsByRisk.get(normalize(alias)) : undefined;
  if (byAlias?.length) return byAlias[0];

  const byCategory = category ? actionsByRisk.get(categoryToRiskId[category] ? normalize(categoryToRiskId[category]) : "") : undefined;
  if (byCategory?.length) return byCategory[0];

  const byLabel = Array.from(actionsByRisk.values())
    .flat()
    .find((c) => {
      const rid = normalize((c as any).risk_id || "");
      return rid === label || rid.includes(label) || label.includes(rid);
    });
  return byLabel;
};

const makeActionForAssessment = (a: Assessment, establishmentId?: string): ActionItem => {
  const catalog = pickCatalogAction(a);
  const title = catalog?.title ? catalog.title : `Mettre en oeuvre les mesures pour ${a.riskLabel}`;
  const description = catalog?.description
    ? catalog.description
    : "Definir les mesures correctives et les responsables";

  return {
    id: uid(),
    establishmentId: establishmentId ?? a.workUnitId,
    assessmentId: a.id,
    title,
    description,
    steps: [
      { id: uid(), label: "Analyser le risque", done: false },
      { id: uid(), label: "Definir mesures et responsable", done: false },
      { id: uid(), label: "Mettre en oeuvre", done: false },
    ],
    owner: "A definir",
    dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    status: "TO_DO",
    priority: a.priority,
    createdAt: new Date().toISOString(),
  };
};

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

const FEATURE_BOOSTS: Record<string, { gravity?: number; frequency?: number; control?: number }> = {
  solvents: { gravity: 2 },
  cold_room: { frequency: 1 },
  night_work: { gravity: 1 },
  public_facing: { frequency: 1 },
  vibrating_tools: { gravity: 1, frequency: 1 },
  outdoor_uv: { gravity: 1 },
  machines: { gravity: 1, frequency: 1 },
  screen_work: { gravity: 0, frequency: 0 },
  manual_handling: { gravity: 1, frequency: 1 },
  noise: { frequency: 1 },
  driving: { frequency: 1 },
  heights: { gravity: 2 },
  bio: { gravity: 2 },
  cleaning_agents: { gravity: 1, frequency: 1 },
};

const applyFeatureAdjustments = (g: number, f: number, c: number, features?: string[]) => {
  if (!features || !features.length) return { gravity: g, frequency: f, control: c };
  let gravity = g;
  let frequency = f;
  let control = c;
  features.forEach((feat) => {
    const boost = FEATURE_BOOSTS[feat];
    if (!boost) return;
    gravity += boost.gravity ?? 0;
    frequency += boost.frequency ?? 0;
    control += boost.control ?? 0;
  });
  gravity = Math.min(Math.max(gravity, 1), 10);
  frequency = Math.min(Math.max(frequency, 1), 10);
  control = Math.min(Math.max(control, 0.5), 10);
  return { gravity, frequency, control };
};

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
  addHazard: (payload: Hazard) => void;
  addAssessment: (payload: AssessmentInput) => void;
  removeAssessment: (id: string) => void;
  updateAssessment: (id: string, payload: Partial<AssessmentInput>) => void;
  addAction: (payload: ActionInput) => void;
  updateAction: (id: string, payload: Partial<ActionItem>) => void;
  updateActionStatus: (id: string, status: ActionItem["status"]) => void;
  toggleActionStep: (actionId: string, stepId: string) => void;
  createVersion: (label: string, reason?: string) => void;
  loadingHazards: boolean;
  prefillFromSector: (sector?: string) => Promise<void>;
}

const USE_REMOTE_ENGINE = (import.meta as any)?.env?.VITE_USE_REMOTE_ENGINE === "true";

export const useDuerpStore = create<DUERPState>((set, get) => ({
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
      return { establishments, workUnits, assessments, actions, selectedEstablishmentId, selectedWorkUnitId };
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

  addHazard: (payload) =>
    set((state) => {
      const map = new Map(state.hazardLibrary.map((h) => [h.id || `haz-${h.risk}`, h]));
      const safeId = payload.id || `haz-${payload.risk.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      map.set(safeId, { ...payload, id: safeId });
      return { ...state, hazardLibrary: Array.from(map.values()) };
    }),

  addAssessment: (payload) =>
    set((state) => {
      const workUnit = state.workUnits.find((w) => w.id === payload.workUnitId);
      const establishmentId = workUnit?.establishmentId || state.selectedEstablishmentId;
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
      const actions = state.actions.some((act) => act.assessmentId === newAssessment.id)
        ? state.actions
        : [...state.actions, makeActionForAssessment(newAssessment, establishmentId)];
      return { ...state, assessments: [...state.assessments, newAssessment], actions };
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
            (payload.assessmentId ? state.assessments.find((a) => a.id === payload.assessmentId)?.priority ?? 4 : 4),
          startDate: payload.startDate,
          endDate: payload.endDate,
          how: payload.how,
        },
      ],
    })),

  updateAction: (id, payload) =>
    set((state) => {
      const now = Date.now();
      return {
        actions: state.actions.map((a) => {
          if (a.id !== id) return a;
          const next = { ...a, ...payload };
          const endTime = next.endDate ? new Date(next.endDate).getTime() : undefined;
          const mustBeLate = endTime !== undefined && endTime < now && next.status !== "DONE";
          return { ...next, status: mustBeLate ? "LATE" : next.status };
        }),
      };
    }),

  updateActionStatus: (id, status) =>
    set((state) => {
      const now = Date.now();
      return {
        actions: state.actions.map((a) => {
          if (a.id !== id) return a;
          const endTime = a.endDate ? new Date(a.endDate).getTime() : undefined;
          const mustBeLate = endTime !== undefined && endTime < now && status !== "DONE";
          return { ...a, status: mustBeLate ? "LATE" : status };
        }),
      };
    }),

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
    const targetWorkUnitId = get().selectedWorkUnitId;
    const targetUnit = targetWorkUnitId ? get().workUnits.find((u) => u.id === targetWorkUnitId) : undefined;
    set(() => ({ loadingHazards: true }));
    try {
      const nafPrefix = naf ? naf.toUpperCase().slice(0, 2) : "";
      const engine = new RiskEngineV3();
      const featuresFlags = (targetUnit?.features || []).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {} as Record<string, boolean>);

      const ctx = {
        nafCode: naf || sector,
        features: featuresFlags,
        activity: targetUnit?.activity,
        unity: targetUnit?.name,
      };

      let engineEvaluations: any[] = [];
      if (USE_REMOTE_ENGINE) {
        try {
          const remote = await duerpApi.evaluateV4(ctx);
          engineEvaluations = Array.isArray(remote?.evaluations) ? remote.evaluations : [];
        } catch (err) {
          console.warn("Remote engine V4 failed, fallback to V3", err);
        }
      }
      if (!engineEvaluations.length) {
        engineEvaluations = engine.evaluate(ctx);
      }

      const engineHazards = engineEvaluations
        .map((e) => ({
          id: e.risk.id,
          category: e.risk.category || "Risque",
          risk: e.risk.name,
          damages: e.risk.description,
          example_prevention: "",
          sector: naf || sector || "",
          gravity: e.severity,
          frequency: e.probability,
          control: e.control,
        }))
        .sort((a, b) => a.risk.localeCompare(b.risk)) as (Hazard & { gravity?: number; frequency?: number; control?: number })[];

      const mappingHazards = buildHazardsFromMapping(naf);
      const presetTable = await loadNafPresets();
      const presetFromJson = presetTable[nafPrefix]?.hazards || [];
      const fallbackPreset = hazardByNafPrefix[nafPrefix] || [];
      const fetched = await fetchHazardsFromSources(sector, naf);

      // Construire une liste prioritaire NAF, puis compléter si insuffisant
      const merged: Hazard[] = [];
      const pushAll = (list: Hazard[]) => list.forEach((h) => merged.push(h));

      if (engineHazards.length) pushAll(engineHazards);
      if (merged.length < 8 && mappingHazards.length) pushAll(mappingHazards);
      if (merged.length < 8 && (presetFromJson.length || fallbackPreset.length || fetched.length)) {
        pushAll(presetFromJson);
        pushAll(fallbackPreset);
        pushAll(fetched);
      }
      if (merged.length < 8) {
        pushAll(riskLibrary); // dernier recours pour étoffer la liste
      }

      const hazardMap = new Map<string, Hazard>();
      merged.forEach((h) => {
        const safeId = h.id || `haz-${h.risk.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        hazardMap.set(safeId, { ...h, id: safeId });
      });

      const existingLibrary = get().hazardLibrary;
      existingLibrary.forEach((h) => {
        hazardMap.set(h.id || `haz-${h.risk.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, h);
      });

      const hazardLibrary = Array.from(hazardMap.values());

      const candidates = Array.from(
        new Map(
          merged.map((h) => {
            const safeId = h.id || `haz-${h.risk.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            return [
              safeId,
              {
                ...h,
                id: safeId,
              },
            ];
          })
        ).values()
      ).sort((a, b) => `${a.category}-${a.risk}`.localeCompare(`${b.category}-${b.risk}`));

      const targetEstablishment = get().selectedEstablishmentId || get().establishments[0]?.id;
      const allUnits = get().workUnits.filter((u) => u.establishmentId === targetEstablishment);
      const targetUnits = targetWorkUnitId ? allUnits.filter((u) => u.id === targetWorkUnitId) : allUnits;
      if (!targetUnits.length) return;

      const assessmentsToAdd: Assessment[] = [];
      targetUnits.forEach((unit) => {
        candidates.forEach((h) => {
          const baseG = (h as PresetHazard).gravity ?? 7;
          const baseF = (h as PresetHazard).frequency ?? 6;
          const baseC = (h as PresetHazard).control ?? 1;
          const { gravity, frequency, control } = applyFeatureAdjustments(baseG, baseF, baseC, unit.features);
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

      set((state) => {
        const targetUnitIds = new Set(targetUnits.map((u) => u.id));
        const remainingAssessments = state.assessments.filter((a) => !targetUnitIds.has(a.workUnitId));
        const remainingActions = state.actions.filter((a) => !a.assessmentId || !targetUnitIds.has(state.assessments.find((as) => as.id === a.assessmentId)?.workUnitId || ""));
        const newActions = assessmentsToAdd.map((a) => makeActionForAssessment(a, targetEstablishment));

        return {
          hazardLibrary,
          assessments: [...remainingAssessments, ...assessmentsToAdd],
          actions: [...remainingActions, ...newActions],
        };
      });
    } finally {
      set(() => ({ loadingHazards: false }));
    }
  },
}));
