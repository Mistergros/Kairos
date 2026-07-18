CREATE TABLE naf (
  code VARCHAR(7) PRIMARY KEY,
  label TEXT NOT NULL,
  risk_tags TEXT[]
);
CREATE TABLE unit_template (
  id TEXT PRIMARY KEY,
  naf_code VARCHAR(7) REFERENCES naf(code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_risk_ids TEXT[],
  suggested BOOLEAN DEFAULT TRUE
);
CREATE TABLE risk (
  id TEXT PRIMARY KEY,
  family TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  examples TEXT[],
  default_severity INT,
  default_frequency INT,
  default_mastery INT
);
CREATE TABLE action (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  details TEXT
);
CREATE TABLE obligation (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  reference TEXT,
  summary TEXT
);
CREATE TABLE risk_action (
  risk_id TEXT REFERENCES risk(id) ON DELETE CASCADE,
  action_id TEXT REFERENCES action(id) ON DELETE CASCADE,
  PRIMARY KEY (risk_id, action_id)
);
CREATE TABLE risk_obligation (
  risk_id TEXT REFERENCES risk(id) ON DELETE CASCADE,
  obligation_id TEXT REFERENCES obligation(id) ON DELETE CASCADE,
  PRIMARY KEY (risk_id, obligation_id)
);
-- Company-specific
CREATE TABLE company_unit (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  tenant_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  headcount INT DEFAULT 0,
  naf_code VARCHAR(7) REFERENCES naf(code)
);
CREATE TABLE unit_risk_assessment (
  id UUID PRIMARY KEY,
  unit_id UUID REFERENCES company_unit(id) ON DELETE CASCADE,
  tenant_id UUID,
  risk_id TEXT REFERENCES risk(id) ON DELETE CASCADE,
  context TEXT,
  existing_measures TEXT[],
  severity INT CHECK (severity BETWEEN 1 AND 5),
  frequency INT CHECK (frequency BETWEEN 1 AND 5),
  mastery INT CHECK (mastery BETWEEN 0 AND 5),
  score INT GENERATED ALWAYS AS (severity * frequency - mastery) STORED
);
CREATE TABLE corrective_action (
  id UUID PRIMARY KEY,
  assessment_id UUID REFERENCES unit_risk_assessment(id) ON DELETE CASCADE,
  tenant_id UUID,
  action_id TEXT REFERENCES action(id),
  owner TEXT,
  due_date DATE,
  status TEXT CHECK (status IN ('todo','in_progress','done','deferred')) DEFAULT 'todo'
);
CREATE INDEX idx_unit_by_company ON company_unit(company_id);
CREATE INDEX idx_unit_by_tenant ON company_unit(tenant_id);
CREATE INDEX idx_assessment_by_unit ON unit_risk_assessment(unit_id);
CREATE INDEX idx_assessment_by_tenant ON unit_risk_assessment(tenant_id);
CREATE INDEX idx_action_by_assessment ON corrective_action(assessment_id);
CREATE INDEX idx_action_by_tenant ON corrective_action(tenant_id);

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
  updated_at TIMESTAMPTZ
);
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
  created_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_versions_org ON duerp_versions(org_id);
