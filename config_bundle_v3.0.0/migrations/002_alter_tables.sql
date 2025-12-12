
-- 002_alter_tables.sql
CREATE INDEX IF NOT EXISTS idx_risk_family ON risk(family);
CREATE INDEX IF NOT EXISTS idx_action_type ON action(type);
CREATE INDEX IF NOT EXISTS idx_unit_template_naf ON unit_template(naf_code);
