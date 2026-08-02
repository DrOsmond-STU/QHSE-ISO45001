-- Task 1.2 — RLS untuk 2 dari 3 tabel baru (Modul 01, template industri &
-- kalender). Pola standar (tenant_id NOT NULL), identik task 1.1.
--
-- industry_templates SENGAJA TIDAK dapat RLS di sini — tabel itu TIDAK
-- PUNYA kolom tenant_id sama sekali (TDD §6.3 "data referensi non-tenant",
-- schema.prisma banner comment model IndustryTemplate). Generic RLS suite
-- (test/rls/generic-tenant-isolation.integration-spec.ts, task 0.3)
-- introspeksi information_schema.columns WHERE column_name='tenant_id' —
-- industry_templates otomatis TIDAK masuk daftar tabel yang diuji/dijamin
-- RLS-nya, tanpa perlu whitelist manual apa pun. Isolasinya murni lewat
-- otorisasi aplikasi (RBAC org.industry_template.manage, Super Admin
-- Platform), bukan RLS — konsisten dengan sifatnya sebagai katalog GLOBAL
-- yang MEMANG harus terlihat lintas tenant (bukan celah keamanan).
ALTER TABLE "holiday_calendars" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "holiday_calendars" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "holiday_calendars"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "holiday_calendars" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "holiday_calendar_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "holiday_calendar_entries" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "holiday_calendar_entries"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "holiday_calendar_entries" TO qhse_app$sql$; END IF; END $$;

-- industry_templates TETAP butuh GRANT eksplisit (ALTER DEFAULT PRIVILEGES
-- sejak 0.8 sudah mencakup ini otomatis untuk tabel baru manapun, baris ini
-- cuma menegaskan eksplisit pola yang sama dgn tabel lain supaya migration
-- ini tidak diam-diam mengandalkan default privileges tanpa disebut).
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "industry_templates" TO qhse_app$sql$; END IF; END $$;
