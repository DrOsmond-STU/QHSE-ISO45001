-- Task 5.1 — RLS (TDD §5.2) utk 7 tabel baru, pola PERSIS
-- rls-policy.template.sql, tenant_id ada di seluruh tabel.

ALTER TABLE "ncr_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ncr_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "ncr_records"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "ncr_records" TO qhse_app;

ALTER TABLE "customer_complaints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_complaints" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "customer_complaints"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "customer_complaints" TO qhse_app;

ALTER TABLE "quality_inspections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quality_inspections" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "quality_inspections"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "quality_inspections" TO qhse_app;

ALTER TABLE "quality_inspection_parameters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quality_inspection_parameters" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "quality_inspection_parameters"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "quality_inspection_parameters" TO qhse_app;

ALTER TABLE "supplier_quality_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supplier_quality_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "supplier_quality_records"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "supplier_quality_records" TO qhse_app;

ALTER TABLE "quality_objectives" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quality_objectives" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "quality_objectives"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "quality_objectives" TO qhse_app;

ALTER TABLE "quality_objective_progress_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quality_objective_progress_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "quality_objective_progress_logs"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "quality_objective_progress_logs" TO qhse_app;
