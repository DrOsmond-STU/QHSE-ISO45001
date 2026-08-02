-- Task 5.2 — RLS (TDD §5.2) utk 7 tabel baru, pola PERSIS
-- rls-policy.template.sql, tenant_id ada di seluruh tabel.

ALTER TABLE "environmental_aspects_impacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "environmental_aspects_impacts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "environmental_aspects_impacts"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "environmental_aspects_impacts" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "environmental_monitoring_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "environmental_monitoring_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "environmental_monitoring_records"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "environmental_monitoring_records" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "waste_manifest_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "waste_manifest_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "waste_manifest_records"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "waste_manifest_records" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "waste_generation_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "waste_generation_log" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "waste_generation_log"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "waste_generation_log" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "proper_self_assessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "proper_self_assessment" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "proper_self_assessment"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "proper_self_assessment" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "proper_self_assessment_criteria_scores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "proper_self_assessment_criteria_scores" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "proper_self_assessment_criteria_scores"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "proper_self_assessment_criteria_scores" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "environmental_permits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "environmental_permits" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "environmental_permits"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "environmental_permits" TO qhse_app$sql$; END IF; END $$;
