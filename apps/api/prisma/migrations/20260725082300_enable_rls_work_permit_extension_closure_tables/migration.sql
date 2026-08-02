-- Task 3.4 — RLS (TDD §5.2) utk 2 tabel baru, pola PERSIS
-- rls-policy.template.sql, tenant_id ada di kedua tabel.

ALTER TABLE "work_permit_extensions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_permit_extensions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "work_permit_extensions"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "work_permit_extensions" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "work_permit_closures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_permit_closures" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "work_permit_closures"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "work_permit_closures" TO qhse_app$sql$; END IF; END $$;
