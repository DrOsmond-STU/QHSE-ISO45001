-- Task 3.2 — RLS untuk 11 tabel baru (Modul 05 sisa: HIRA/JSA/HIRADC/risk
-- register). Pola standar (tenant_id NOT NULL di seluruh 11 tabel).
ALTER TABLE "hira_assessments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hira_assessments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "hira_assessments"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "hira_assessments" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "hira_team_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hira_team_members" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "hira_team_members"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "hira_team_members" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "hira_hazard_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hira_hazard_lines" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "hira_hazard_lines"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "hira_hazard_lines" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "jsa_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jsa_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "jsa_records"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "jsa_records" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "jsa_job_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jsa_job_steps" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "jsa_job_steps"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "jsa_job_steps" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "jsa_step_hazards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jsa_step_hazards" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "jsa_step_hazards"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "jsa_step_hazards" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "jsa_crew_acknowledgements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jsa_crew_acknowledgements" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "jsa_crew_acknowledgements"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "jsa_crew_acknowledgements" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "hiradc_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hiradc_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "hiradc_records"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "hiradc_records" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "hiradc_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hiradc_lines" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "hiradc_lines"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "hiradc_lines" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "risk_register" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "risk_register" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "risk_register"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "risk_register" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "risk_treatment_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "risk_treatment_plans" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "risk_treatment_plans"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "risk_treatment_plans" TO qhse_app$sql$; END IF; END $$;
