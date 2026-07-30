-- Task 0.10 — RLS untuk numbering_configs. tenant_id NOT NULL (tidak ada
-- konsep "system row" seperti roles/role_permissions task 0.8), jadi pola
-- template standar (rls-policy.template.sql) apa adanya — sama seperti
-- workflow_* tables task 0.9.

ALTER TABLE "numbering_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "numbering_configs" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "numbering_configs"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "numbering_configs" TO qhse_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO qhse_app;
