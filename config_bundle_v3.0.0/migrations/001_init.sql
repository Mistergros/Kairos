
-- 001_init.sql
CREATE TABLE IF NOT EXISTS _migrations (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS _config_version (
  id BIGSERIAL PRIMARY KEY,
  version TEXT NOT NULL,
  hash TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk (
  id TEXT PRIMARY KEY,
  family TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  default_severity INT,
  default_frequency INT,
  default_mastery INT,
  examples TEXT[]
);

CREATE TABLE IF NOT EXISTS action (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  details TEXT
);

CREATE TABLE IF NOT EXISTS obligation (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  reference TEXT,
  summary TEXT
);

CREATE TABLE IF NOT EXISTS naf (
  code VARCHAR(7) PRIMARY KEY,
  label TEXT NOT NULL,
  risk_tags TEXT[],
  notes TEXT
);

CREATE TABLE IF NOT EXISTS unit_template (
  id TEXT PRIMARY KEY,
  naf_code VARCHAR(7) REFERENCES naf(code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_risk_ids TEXT[],
  suggested BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS activity_scoring (
  id BIGSERIAL PRIMARY KEY,
  activity TEXT NOT NULL,
  risk_id TEXT NOT NULL REFERENCES risk(id) ON DELETE CASCADE,
  severity INT CHECK (severity BETWEEN 0 AND 5),
  frequency INT CHECK (frequency BETWEEN 0 AND 5),
  control INT CHECK (control BETWEEN -5 AND 5) DEFAULT 0,
  UNIQUE(activity, risk_id)
);
