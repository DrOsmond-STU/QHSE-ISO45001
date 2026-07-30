-- Task 0.11 — RLS untuk 5 tabel Notification Service. tenant_id NOT NULL di
-- semua tabel KECUALI notification_templates (nullable = template default
-- sistem lintas tenant, pola sama roles/role_permissions task 0.8) — jadi
-- notification_templates pakai kebijakan RLS asimetris (baris sistem
-- terlihat lintas tenant), 4 tabel lain pakai pola template standar.

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "notifications"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "notifications" TO qhse_app;

ALTER TABLE "notification_channels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_channels" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "notification_channels"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "notification_channels" TO qhse_app;

-- Asimetris (pola sama roles/role_permissions task 0.8): tenant_id NULL =
-- template default sistem, WAJIB terlihat oleh SEMUA tenant (fallback
-- resolusi template) sekaligus terisolasi utk baris tenant_id NOT NULL.
ALTER TABLE "notification_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_templates" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "notification_templates"
  USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "notification_templates" TO qhse_app;

ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_preferences" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "notification_preferences"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "notification_preferences" TO qhse_app;

ALTER TABLE "notification_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_logs" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "notification_logs"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "notification_logs" TO qhse_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO qhse_app;
