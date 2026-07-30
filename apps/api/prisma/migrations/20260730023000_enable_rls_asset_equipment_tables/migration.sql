-- Task 6.1 — RLS (TDD §5.2) utk 5 tabel baru Modul 15 (Asset & Equipment
-- Management), pola PERSIS rls-policy.template.sql, tenant_id ada di
-- seluruh tabel. TIDAK ada tabel append-only/immutable-by-GRANT di modul
-- ini (beda medical_record_access_logs 5.3/system_audit_logs 0.13) — PRD
-- Modul 15 tidak mensyaratkan immutability DB-level utk maintenance_records
-- ataupun asset_transfer_log, jadi GRANT penuh standar spt tabel lain.

ALTER TABLE "asset_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "asset_categories"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "asset_categories" TO qhse_app;

ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assets" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "assets"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "assets" TO qhse_app;

ALTER TABLE "maintenance_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_schedules" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "maintenance_schedules"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "maintenance_schedules" TO qhse_app;

ALTER TABLE "maintenance_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "maintenance_records"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "maintenance_records" TO qhse_app;

ALTER TABLE "asset_transfer_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_transfer_log" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "asset_transfer_log"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "asset_transfer_log" TO qhse_app;
