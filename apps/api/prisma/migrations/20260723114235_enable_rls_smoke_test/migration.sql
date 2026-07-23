-- RLS template (TDD §5.2, TASK_INSTRUCTION.md task 0.3) — enable + policy per
-- tabel domain. Role runtime (qhse_app) DIASUMSIKAN sudah diprovisioning
-- terpisah dari migration ini (lihat scripts/dev-db-setup.sh untuk lokal;
-- Vault/KMS untuk staging/production, SECURITY.md) — provisioning role/secret
-- bukan tanggung jawab migration schema yang sama di semua environment.

ALTER TABLE "_rls_smoke_test" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_rls_smoke_test" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "_rls_smoke_test"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "_rls_smoke_test" TO qhse_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO qhse_app;
