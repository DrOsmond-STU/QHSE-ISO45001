-- Task 1.3 — RLS untuk sso_mappings (tenant_id NOT NULL, pola standar).
ALTER TABLE "sso_mappings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sso_mappings" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "sso_mappings"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "sso_mappings" TO qhse_app;
