-- RLS defense-in-depth (konsisten tabel lain) — DbSessionStore sendiri
-- mengakses tabel ini lewat client admin (bypass RLS, pola sama
-- adminPrisma di *-due-scan.service.ts) karena get(userId, sessionId)
-- dipanggil SEBELUM tenant diketahui (lihat banner comment schema.prisma).
-- Tidak ada audit_log_trigger di sini SENGAJA — tabel ini churn tinggi
-- (rotate tiap refresh token) dan murni state keamanan internal, bukan
-- rekaman bisnis/kepatuhan (pengecualian yang sama disebut eksplisit di
-- audit-log-trigger.template.sql, mis. medical_record_access_logs).
ALTER TABLE "session_cache_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session_cache_entries" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "session_cache_entries"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "session_cache_entries" TO qhse_app$sql$; END IF; END $$;
