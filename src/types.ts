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
}

export interface WorkUnit {
  id: string;
  establishmentId: string;
  name: string;
  description?: string;
  location?: string;
  headcount?: number;
}

export interface Hazard {
  id: string;
  category: string;
  risk: string;
  damages?: string;
  example_prevention?: string;
  source?: string;
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
}

export interface ActionItem {
  id: string;
  establishmentId: string;
  assessmentId?: string;
  title: string;
  description?: string;
  steps?: { id: string; label: string; done: boolean }[];
  owner?: string;
  dueDate?: string;
  status: ActionStatus;
  cost?: number;
  evidenceUrl?: string;
  priority: Priority;
  createdAt: string;
}

export interface VersionEntry {
  id: string;
  establishmentId: string;
  label: string;
  reason?: string;
  hash: string;
  createdAt: string;
}
