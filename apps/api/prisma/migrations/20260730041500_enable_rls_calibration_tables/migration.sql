-- Task 6.2 — RLS (TDD §5.2) utk 5 tabel baru Modul 16 (Calibration
-- Management), pola PERSIS rls-policy.template.sql, tenant_id ada di
-- seluruh tabel. TIDAK ada tabel append-only/immutable-by-GRANT di modul
-- ini (beda medical_record_access_logs 5.3/system_audit_logs 0.13) — PRD
-- Modul 16 tidak mensyaratkan immutability DB-level manapun, jadi GRANT
-- penuh standar spt tabel lain.

ALTER TABLE "calibration_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calibration_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "calibration_items"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "calibration_items" TO qhse_app;

ALTER TABLE "calibration_providers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calibration_providers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "calibration_providers"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "calibration_providers" TO qhse_app;

ALTER TABLE "calibration_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calibration_schedules" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "calibration_schedules"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "calibration_schedules" TO qhse_app;

ALTER TABLE "calibration_certificates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calibration_certificates" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "calibration_certificates"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "calibration_certificates" TO qhse_app;

ALTER TABLE "out_of_tolerance_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "out_of_tolerance_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "out_of_tolerance_records"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "out_of_tolerance_records" TO qhse_app;
