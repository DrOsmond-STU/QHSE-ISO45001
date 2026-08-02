-- Task 1.4 — RLS untuk 2 tabel baru (delegation_of_authority, Modul 02;
-- workflow_delegations, Workflow Engine platform). Pola standar
-- (tenant_id NOT NULL), identik task 1.1/1.2/1.3.
ALTER TABLE "delegation_of_authority" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "delegation_of_authority" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "delegation_of_authority"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "delegation_of_authority" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "workflow_delegations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_delegations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "workflow_delegations"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "workflow_delegations" TO qhse_app$sql$; END IF; END $$;
