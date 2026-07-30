-- RLS template (TDD §5.2, TASK_INSTRUCTION.md task 0.3) — enable + policy per
-- tabel domain. Role runtime (qhse_app) DIASUMSIKAN sudah diprovisioning
-- terpisah dari migration ini (lihat scripts/dev-db-setup.sh untuk lokal;
-- Vault/KMS untuk staging/production, SECURITY.md) — provisioning role/secret
-- bukan tanggung jawab migration schema yang sama di semua environment.
--
-- Task 0.6 — 3 tabel auth-critical sekaligus (users, user_sessions,
-- password_policies). users.email hanya dibaca lewat tenantContextStorage
-- yang di-set eksplisit dari header x-tenant-id di endpoint /auth/login
-- (pre-JWT, lihat platform/auth/auth.service.ts) — tetap fail closed karena
-- RLS di level database, bukan cuma guard aplikasi.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "users"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "users" TO qhse_app;

ALTER TABLE "user_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_sessions" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "user_sessions"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "user_sessions" TO qhse_app;

ALTER TABLE "password_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_policies" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "password_policies"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "password_policies" TO qhse_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO qhse_app;
