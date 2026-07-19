-- Les tables catalogue (naf, unit_template, risk, action, obligation,
-- risk_action, risk_obligation) ont ete supprimees le 19/07/2026 : audit a
-- montre que RiskEngineV4 ne les lit jamais (tout vient de config/*.json en
-- fichiers), et que 6 des 7 n'etaient interrogees par aucune route API
-- appelee cote front. Voir ARCHITECTURE.md. Sauvegarde des donnees avant
-- suppression conservee hors du depot.
-- company_unit / unit_risk_assessment / corrective_action (l'ancien schema
-- "company-specific", pre-consolidation Neon) ont ete supprimees le
-- 19/07/2026 : deja confirmees mortes lors de la migration du 18/07/2026
-- (remplacees par establishments/work_units/assessments/actions ci-dessous),
-- et leurs cles etrangeres vers naf/risk/action rendaient ce fichier
-- invalide sur une base neuve depuis la suppression des tables catalogue.

-- App data (consolidated onto Neon, replaces direct browser->Supabase writes).
-- Column names mirror src/repos/*Repo.ts's toDb()/dbToX() mappers exactly.
-- org_id is the Clerk user id (e.g. "user_2abc...") — TEXT, not UUID.
CREATE TABLE IF NOT EXISTS establishments (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  siren TEXT,
  siret TEXT,
  code_naf VARCHAR(7),
  sector TEXT,
  address TEXT,
  headcount INT
);
CREATE INDEX IF NOT EXISTS idx_establishments_org ON establishments(org_id);

CREATE TABLE IF NOT EXISTS work_units (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  establishment_id TEXT REFERENCES establishments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  headcount INT,
  activity TEXT,
  features TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  measurements JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_work_units_org ON work_units(org_id);
CREATE INDEX IF NOT EXISTS idx_work_units_establishment ON work_units(establishment_id);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  work_unit_id TEXT REFERENCES work_units(id) ON DELETE CASCADE,
  hazard_id TEXT,
  hazard_category TEXT,
  risk_label TEXT NOT NULL,
  damages TEXT,
  existing_measures TEXT,
  proposed_measures TEXT,
  gravity NUMERIC,
  frequency NUMERIC,
  control NUMERIC,
  score NUMERIC,
  priority INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  source TEXT,
  source_url TEXT
);
-- Migration pour les bases deja creees avant l'ajout des liens sources (voir REFERENTIELS.md).
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS source_url TEXT;
CREATE INDEX IF NOT EXISTS idx_assessments_org ON assessments(org_id);
CREATE INDEX IF NOT EXISTS idx_assessments_work_unit ON assessments(work_unit_id);

CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  establishment_id TEXT REFERENCES establishments(id) ON DELETE CASCADE,
  assessment_id TEXT REFERENCES assessments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner TEXT,
  start_date DATE,
  due_date DATE,
  end_date DATE,
  how TEXT,
  status TEXT NOT NULL DEFAULT 'TO_DO',
  priority INT,
  cost NUMERIC,
  evidence_url TEXT,
  steps JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_actions_org ON actions(org_id);
CREATE INDEX IF NOT EXISTS idx_actions_establishment ON actions(establishment_id);

CREATE TABLE IF NOT EXISTS duerp_versions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  establishment_id TEXT REFERENCES establishments(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  reason TEXT,
  hash TEXT,
  snapshot JSONB,
  created_at TIMESTAMPTZ
);
-- Migration pour les bases deja creees avant l'ajout de l'archivage complet (snapshot).
ALTER TABLE duerp_versions ADD COLUMN IF NOT EXISTS snapshot JSONB;
CREATE INDEX IF NOT EXISTS idx_versions_org ON duerp_versions(org_id);
