-- Task 1.6 — RLS untuk 3 tabel baru (Modul 31, import data & branding).
-- Pola standar (tenant_id NOT NULL), identik task 1.1-1.5. Beda dari 1.5
-- (yang punya 1 tabel global TANPA RLS, subscription_plans): SEMUA 3
-- tabel task 1.6 tenant-scoped, tidak ada pengecualian di sini.
ALTER TABLE "data_import_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_import_jobs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "data_import_jobs"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "data_import_jobs" TO qhse_app;

ALTER TABLE "data_import_errors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_import_errors" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "data_import_errors"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "data_import_errors" TO qhse_app;

ALTER TABLE "tenant_branding_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_branding_configs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "tenant_branding_configs"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "tenant_branding_configs" TO qhse_app;
