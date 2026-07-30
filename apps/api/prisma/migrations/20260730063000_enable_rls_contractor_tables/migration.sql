-- Task 6.3 — RLS (TDD §5.2) utk 7 tabel baru Modul 17 (Contractor
-- Management), pola PERSIS rls-policy.template.sql, tenant_id ada di
-- seluruh tabel. TIDAK ada tabel append-only/immutable-by-GRANT di modul
-- ini (beda medical_record_access_logs 5.3/system_audit_logs 0.13) — PRD
-- Modul 17 tidak mensyaratkan immutability DB-level manapun, jadi GRANT
-- penuh standar spt tabel lain.

ALTER TABLE "contractors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contractors" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "contractors"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "contractors" TO qhse_app;

ALTER TABLE "contractor_prequalification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contractor_prequalification" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "contractor_prequalification"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "contractor_prequalification" TO qhse_app;

ALTER TABLE "contractor_prequalification_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contractor_prequalification_documents" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "contractor_prequalification_documents"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "contractor_prequalification_documents" TO qhse_app;

ALTER TABLE "contractor_document_compliance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contractor_document_compliance" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "contractor_document_compliance"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "contractor_document_compliance" TO qhse_app;

ALTER TABLE "contractor_workers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contractor_workers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "contractor_workers"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "contractor_workers" TO qhse_app;

ALTER TABLE "contractor_project_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contractor_project_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "contractor_project_assignments"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "contractor_project_assignments" TO qhse_app;

ALTER TABLE "contractor_performance_evaluations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contractor_performance_evaluations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "contractor_performance_evaluations"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "contractor_performance_evaluations" TO qhse_app;
