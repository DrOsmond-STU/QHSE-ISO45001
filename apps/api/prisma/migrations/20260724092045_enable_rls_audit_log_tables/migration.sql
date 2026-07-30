-- Task 0.13 — RLS untuk system_audit_logs + _audit_log_smoke_test.
--
-- system_audit_logs: kebijakan STRICT EQUALITY (BUKAN pola asimetris
-- roles/notification_templates 0.8/0.11) — tenant_id IS NULL (baris
-- "system", mis. dari seed script di luar withRls()) SENGAJA tidak
-- terlihat siapa pun lewat qhse_app sama sekali (fail closed); viewer
-- lintas-tenant Super Admin Platform (Modul 31) perlu koneksi admin
-- terpisah, bukan cakupan task ini.
ALTER TABLE "system_audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_audit_logs" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "system_audit_logs"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- PENTING (dibuktikan empiris, TDD §26): RLS status TIDAK diturunkan dari
-- parent ke partisi yang sudah ada (pg_class.relrowsecurity partisi tetap
-- `false` walau parent `true`) — dan MENGAKSES PARTISI LANGSUNG (bukan
-- lewat nama parent) SEPENUHNYA MEM-BYPASS RLS kalau ini tidak diulang di
-- tiap partisi. Job audit-log-partition-maintenance mengulang 2 baris ini
-- (ENABLE + FORCE + CREATE POLICY) utk SETIAP partisi baru yang dibuatnya.
ALTER TABLE "system_audit_logs_y2026m07" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_audit_logs_y2026m07" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "system_audit_logs_y2026m07"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

ALTER TABLE "system_audit_logs_y2026m08" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_audit_logs_y2026m08" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "system_audit_logs_y2026m08"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Append-only (acceptance criterion task 0.13: "entri audit tidak bisa
-- diedit/dihapus"). INSERT tetap diberikan ke qhse_app (dipakai
-- AuditLogService.record() untuk entri semantik manual — login/export/
-- approve, TDD §6.1 — yang bukan mutasi baris sederhana sehingga tidak
-- tertangkap trigger generik); trigger audit_log_capture() sendiri TIDAK
-- bergantung pada grant ini sama sekali (SECURITY DEFINER, lihat migration
-- init). UPDATE/DELETE DIREVOKE eksplisit — WAJIB, dibuktikan empiris:
-- `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ... TO qhse_app` yang
-- sudah berlaku sejak migration 0.8/0.11/0.12 OTOMATIS memberi
-- SELECT/INSERT/UPDATE/DELETE ke SEMUA tabel baru yang role migrasi buat
-- (termasuk tabel ini) — tanpa REVOKE eksplisit di bawah, qhse_app bisa
-- UPDATE/DELETE baris audit walau tidak pernah diberi grant itu secara
-- sengaja di mana pun.
GRANT SELECT, INSERT ON "system_audit_logs" TO qhse_app;
REVOKE UPDATE, DELETE ON "system_audit_logs" FROM qhse_app;

-- Sama utk kedua partisi awal — TERBUKTI TIDAK CUKUP hanya REVOKE di
-- parent: privilege partisi BARU (dibuat job maintenance) diberikan
-- INDEPENDEN oleh ALTER DEFAULT PRIVILEGES di atas, BUKAN diwariskan dari
-- ACL parent saat ini (dibuktikan empiris — parent yang sudah direvoke
-- UPDATE/DELETE tetap menghasilkan partisi baru dengan UPDATE/DELETE utuh
-- kalau tidak direvoke ulang secara eksplisit per partisi). Job
-- audit-log-partition-maintenance mengulang REVOKE ini utk SETIAP partisi
-- baru yang dibuatnya.
GRANT SELECT, INSERT ON "system_audit_logs_y2026m07" TO qhse_app;
REVOKE UPDATE, DELETE ON "system_audit_logs_y2026m07" FROM qhse_app;
GRANT SELECT, INSERT ON "system_audit_logs_y2026m08" TO qhse_app;
REVOKE UPDATE, DELETE ON "system_audit_logs_y2026m08" FROM qhse_app;

-- _audit_log_smoke_test: tabel SUMBER (dipicu trigger), bukan tabel audit
-- itu sendiri — pola RLS standar (tenant_id NOT NULL) apa adanya, CRUD
-- penuh utk qhse_app (properti append-only yang diuji adalah milik
-- system_audit_logs, bukan tabel sumber ini).
ALTER TABLE "_audit_log_smoke_test" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_audit_log_smoke_test" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "_audit_log_smoke_test"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "_audit_log_smoke_test" TO qhse_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO qhse_app;
