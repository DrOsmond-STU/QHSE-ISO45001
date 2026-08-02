-- Task 1.1 — RLS untuk 8 tabel hierarki organisasi (Modul 01).
--
-- tenants: TIDAK punya kolom tenant_id terpisah (dirinya sendiri akar
-- hierarki, Master PRD §11 poin 2 pengecualian eksplisit) — kebijakan
-- membandingkan PK "tenant_id" itu sendiri terhadap context, IDENTIK
-- bentuknya dengan tenant_isolation_policy tabel lain (bukan kasus khusus
-- secara SQL, hanya secara semantik PK==FK-yang-biasanya-terpisah).
-- Efeknya: qhse_app hanya bisa melihat BARIS TENANT-NYA SENDIRI dari tabel
-- ini — viewer lintas-tenant Super Admin Platform (Modul 31) perlu koneksi
-- admin terpisah, pola sama system_audit_logs (task 0.13).
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "tenants"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "tenants" TO qhse_app$sql$; END IF; END $$;

-- Pola standar (tenant_id NOT NULL) apa adanya untuk 7 tabel sisanya.
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companies" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "companies"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "companies" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "branches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "branches" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "branches"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "branches" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "sites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sites" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "sites"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "sites" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "departments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "departments"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "departments" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "cost_centers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cost_centers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "cost_centers"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "cost_centers" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "locations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "locations"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "locations" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "organization_charts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_charts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "organization_charts"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "organization_charts" TO qhse_app$sql$; END IF; END $$;

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO qhse_app$sql$; END IF; END $$;
