-- Task 0.9 — RLS untuk 5 tabel Workflow Engine. Semua tenant_id NOT NULL
-- (tidak ada konsep "system row" seperti roles/role_permissions task 0.8),
-- jadi pola template standar (rls-policy.template.sql) apa adanya.

ALTER TABLE "workflow_definitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_definitions" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "workflow_definitions"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "workflow_definitions" TO qhse_app;

ALTER TABLE "workflow_stages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_stages" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "workflow_stages"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "workflow_stages" TO qhse_app;

ALTER TABLE "workflow_transitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_transitions" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "workflow_transitions"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "workflow_transitions" TO qhse_app;

ALTER TABLE "workflow_instances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_instances" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "workflow_instances"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "workflow_instances" TO qhse_app;

ALTER TABLE "workflow_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_tasks" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "workflow_tasks"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "workflow_tasks" TO qhse_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO qhse_app;
