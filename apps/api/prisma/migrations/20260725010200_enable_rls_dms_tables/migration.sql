-- Task 2.1 — RLS untuk 6 tabel baru (Modul 03, Document Management System).
-- Pola standar (tenant_id NOT NULL di SEMUA 6 tabel, tanpa pengecualian —
-- beda dari 1.2/1.5 yang punya tabel global tanpa tenant_id/RLS).
ALTER TABLE "document_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "document_categories"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "document_categories" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "documents"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "documents" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "document_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_versions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "document_versions"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "document_versions" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "document_distribution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_distribution" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "document_distribution"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "document_distribution" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "read_acknowledgement_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "read_acknowledgement_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "read_acknowledgement_logs"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "read_acknowledgement_logs" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "document_review_schedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_review_schedule" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "document_review_schedule"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "document_review_schedule" TO qhse_app$sql$; END IF; END $$;
