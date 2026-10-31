export type Priority = 1 | 2 | 3 | 4;
export type ActionStatus = 'TO_DO' | 'IN_PROGRESS' | 'LATE' | 'DONE';

export interface Establishment {
  id: string;
  name: string;
  siren?: string;
  siret?: string;
  codeNaf?: string;
  sector?: string;
  address?: string;
  headcount?: number;
  /** Offre Pro (id "consultants") : client final auquel appartient l'établissement. */
  clientName?: string;
  /** Logo de l’entreprise évaluée, en couverture du PDF. */
  logo?: { dataUrl: string; width: number; height: number } | null;
  /** Date d'archivage : l'établissement sort des listes mais reste conservé (40 ans). */
  archivedAt?: string | null;
}

export interface WorkUnit {
  id: string;
  establishmentId: string;
  name: string;
  description?: string;
  location?: string;
  headcount?: number;
  features?: string[];
  activity?: string;
  tags?: string[];
  measurements?: Record<string, number>;
}

export interface Hazard {
  id: string;
  category: string;
  risk: string;
  damages?: string;
  example_prevention?: string;
  // Document officiel précis (ex. "INRS ED 6490 — ...") + date de dernière
  // vérification (AAAA-MM-JJ). Voir REFERENTIELS.md pour l'état du sourcing.
  source?: string;
  source_verified?: string;
  sourceUrl?: string;
  sector?: string;
}

export interface Assessment {
  id: string;
  workUnitId: string;
  hazardId: string;
  hazardCategory: string;
  riskLabel: string;
  damages?: string;
  existingMeasures?: string;
  proposedMeasures?: string;
  gravity: number;
  frequency: number;
  control: number;
  score: number;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  // Document officiel dont ce risque est issu (ex. "INRS ED 6490 — ..."), s'il est connu.
  source?: string;
  sourceUrl?: string;
}

export interface ActionItem {
  id: string;
  establishmentId: string;
  assessmentId?: string;
  title: string;
  description?: string;
  steps?: { id: string; label: string; done: boolean }[];
  owner?: string;
  startDate?: string;
  dueDate?: string;
  endDate?: string;
  how?: string;
  status: ActionStatus;
  /** Coût estimé en euros (programme annuel de prévention). */
  cost?: number;
  /** Ressources de l'entreprise mobilisées (programme annuel de prévention). */
  resources?: string;
  /** Indicateur de résultat (programme annuel de prévention). */
  indicator?: string;
  evidenceUrl?: string;
  priority: Priority;
  createdAt: string;
}

export interface VersionSnapshot {
  /** L'établissement tel qu'il était à la date de la version (versions récentes). */
  establishment?: Establishment;
  workUnits: WorkUnit[];
  assessments: Assessment[];
  actions: ActionItem[];
}

export interface VersionEntry {
  id: string;
  establishmentId: string;
  label: string;
  reason?: string;
  hash: string;
  createdAt: string;
  snapshot?: VersionSnapshot;
}

// Marque du cabinet sur les documents PDF (offre Pro), voir api/branding.ts.
export type Branding = {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  color?: string;
  logo?: { dataUrl: string; width: number; height: number } | null;
  hideKaijos?: boolean;
};
