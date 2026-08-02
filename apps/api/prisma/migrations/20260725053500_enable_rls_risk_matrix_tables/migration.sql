-- Task 3.1 — RLS untuk 4 tabel baru (Modul 05, Risk Management matriks +
-- hazard register). Pola standar (tenant_id NOT NULL di seluruh 4 tabel,
-- TIDAK ADA tabel global/no-tenant di task ini — beda dari 2.2).
ALTER TABLE "risk_matrix_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "risk_matrix_configs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "risk_matrix_configs"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "risk_matrix_configs" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "risk_matrix_levels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "risk_matrix_levels" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "risk_matrix_levels"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "risk_matrix_levels" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "risk_matrix_cells" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "risk_matrix_cells" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "risk_matrix_cells"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "risk_matrix_cells" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "hazard_register" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hazard_register" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "hazard_register"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "hazard_register" TO qhse_app$sql$; END IF; END $$;
