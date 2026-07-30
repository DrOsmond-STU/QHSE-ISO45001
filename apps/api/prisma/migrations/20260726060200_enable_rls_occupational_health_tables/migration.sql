-- Task 5.3 — RLS (TDD §5.2) utk 14 tabel baru (13 domain Modul 13 +
-- tenant_encryption_keys platform/field-encryption), pola PERSIS
-- rls-policy.template.sql, tenant_id ada di seluruh tabel.
--
-- medical_record_access_logs: kebijakan tenant_isolation_policy standar
-- SAMA spt tabel lain di bawah, TAPI ditambah GRANT/REVOKE eksplisit —
-- pola PERSIS system_audit_logs (migration 20260724092045, task 0.13):
-- append-only ditegakkan lewat REVOKE UPDATE/DELETE dari qhse_app, BUKAN
-- trigger, krn ALTER DEFAULT PRIVILEGES dari migration 0.8/0.11/0.12
-- otomatis memberi UPDATE/DELETE penuh ke SEMUA tabel baru kalau tidak
-- di-REVOKE eksplisit di sini.

ALTER TABLE "medical_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medical_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "medical_records"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "medical_records" TO qhse_app;

ALTER TABLE "mcu_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mcu_schedules" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "mcu_schedules"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "mcu_schedules" TO qhse_app;

ALTER TABLE "mcu_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mcu_results" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "mcu_results"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "mcu_results" TO qhse_app;

ALTER TABLE "fit_to_work_assessments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fit_to_work_assessments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "fit_to_work_assessments"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "fit_to_work_assessments" TO qhse_app;

ALTER TABLE "occupational_disease_cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "occupational_disease_cases" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "occupational_disease_cases"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "occupational_disease_cases" TO qhse_app;

ALTER TABLE "clinic_visit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clinic_visit_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "clinic_visit_logs"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "clinic_visit_logs" TO qhse_app;

ALTER TABLE "health_surveillance_programs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "health_surveillance_programs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "health_surveillance_programs"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "health_surveillance_programs" TO qhse_app;

ALTER TABLE "health_surveillance_enrollments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "health_surveillance_enrollments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "health_surveillance_enrollments"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "health_surveillance_enrollments" TO qhse_app;

ALTER TABLE "restricted_duty_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "restricted_duty_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "restricted_duty_assignments"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "restricted_duty_assignments" TO qhse_app;

ALTER TABLE "occupational_health_authorized_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "occupational_health_authorized_users" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "occupational_health_authorized_users"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "occupational_health_authorized_users" TO qhse_app;

ALTER TABLE "medical_record_access_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medical_record_access_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "medical_record_access_logs"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT ON "medical_record_access_logs" TO qhse_app;
REVOKE UPDATE, DELETE ON "medical_record_access_logs" FROM qhse_app;

ALTER TABLE "health_data_consents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "health_data_consents" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "health_data_consents"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "health_data_consents" TO qhse_app;

ALTER TABLE "health_data_subject_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "health_data_subject_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "health_data_subject_requests"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "health_data_subject_requests" TO qhse_app;

-- tenant_encryption_keys — TETAP RLS standar (BUKAN pengecualian), lihat
-- banner comment blok model schema.prisma: tabel ini justru paling kritis
-- utk isolasi tenant (kebocoran lintas-tenant di sini = tenant A bisa
-- dekripsi PHI tenant B).
ALTER TABLE "tenant_encryption_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_encryption_keys" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "tenant_encryption_keys"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "tenant_encryption_keys" TO qhse_app;
