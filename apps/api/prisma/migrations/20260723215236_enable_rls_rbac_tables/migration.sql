-- Task 0.8 — RBAC. user_roles: pola standar (tenant_id NOT NULL), sama
-- seperti tabel domain lain.
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_roles" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "user_roles"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "user_roles" TO qhse_app$sql$; END IF; END $$;

-- roles / role_permissions: tenant_id NULLABLE (baris system role lintas
-- tenant, Modul 02 §8.1/BR-05) — kebijakan SENGAJA asimetris:
--   USING mengizinkan baca baris system (tenant_id IS NULL) dari tenant
--   context APAPUN (termasuk tanpa context sama sekali), sementara
--   WITH CHECK KETAT (tidak ada celah NULL) — qhse_app TIDAK PERNAH bisa
--   menulis baris yang mengklaim jadi system role; hanya role
--   admin/migration (DATABASE_URL, bypass RLS) yang seed baris system.
-- BR-05 ("system role immutable") ditegakkan di service layer begitu task
-- 1.3 menambah endpoint tulis — task 0.8 tidak expose write endpoint apa pun
-- ke 2 tabel ini, jadi risiko qhse_app menghapus baris system saat ini masih
-- teoretis (DELETE cuma pakai USING, Postgres tidak punya DELETE CHECK
-- terpisah).
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "roles"
  USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "roles" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_permissions" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "role_permissions"
  USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "role_permissions" TO qhse_app$sql$; END IF; END $$;

-- permissions / permission_groups: TIDAK ADA tenant_id sama sekali (katalog
-- global, platform-managed, Modul 02 §2.2) — tidak ada RLS (tidak ada yang
-- perlu difilter, TDD §6.3). qhse_app hanya dapat READ — hanya role
-- seed/migration yang menulis katalog global, defense-in-depth kalau
-- instance app ter-compromise.
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT ON "permissions" TO qhse_app$sql$; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT ON "permission_groups" TO qhse_app$sql$; END IF; END $$;

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO qhse_app$sql$; END IF; END $$;
