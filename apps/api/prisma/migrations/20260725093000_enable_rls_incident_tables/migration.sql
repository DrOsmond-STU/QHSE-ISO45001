-- Task 3.5 — RLS (TDD §5.2) utk 8 tabel baru, pola PERSIS
-- rls-policy.template.sql, tenant_id ada di seluruh tabel.

ALTER TABLE "incident_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "incident_reports" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "incident_reports"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "incident_reports" TO qhse_app;

ALTER TABLE "incident_investigations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "incident_investigations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "incident_investigations"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "incident_investigations" TO qhse_app;

ALTER TABLE "incident_investigation_team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "incident_investigation_team" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "incident_investigation_team"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "incident_investigation_team" TO qhse_app;

ALTER TABLE "incident_root_causes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "incident_root_causes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "incident_root_causes"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "incident_root_causes" TO qhse_app;

ALTER TABLE "incident_corrective_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "incident_corrective_actions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "incident_corrective_actions"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "incident_corrective_actions" TO qhse_app;

ALTER TABLE "incident_witness_statements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "incident_witness_statements" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "incident_witness_statements"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "incident_witness_statements" TO qhse_app;

ALTER TABLE "incident_regulatory_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "incident_regulatory_reports" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "incident_regulatory_reports"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "incident_regulatory_reports" TO qhse_app;

ALTER TABLE "incident_statistics_cache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "incident_statistics_cache" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "incident_statistics_cache"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "incident_statistics_cache" TO qhse_app;
