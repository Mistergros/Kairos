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
