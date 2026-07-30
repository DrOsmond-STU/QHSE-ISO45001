-- Task 0.12 — RLS untuk attachments. tenant_id NOT NULL (tidak ada konsep
-- "system row"), jadi pola template standar (rls-policy.template.sql) apa
-- adanya — sama seperti numbering_configs (0.10) dan mayoritas tabel
-- notification (0.11).

ALTER TABLE "attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attachments" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "attachments"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "attachments" TO qhse_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO qhse_app;
