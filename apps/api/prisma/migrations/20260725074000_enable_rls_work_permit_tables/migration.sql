-- Task 3.3 — RLS (TDD §5.2) utk seluruh 6 tabel baru, pola PERSIS
-- rls-policy.template.sql, tenant_id ada di semua 6 tabel (tidak ada
-- tabel katalog global spt regulatory_frameworks 2.2).

ALTER TABLE "work_permit_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_permit_types" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "work_permit_types"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "work_permit_types" TO qhse_app;

ALTER TABLE "work_permits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_permits" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "work_permits"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "work_permits" TO qhse_app;

ALTER TABLE "work_permit_hazard_checklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_permit_hazard_checklist" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "work_permit_hazard_checklist"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "work_permit_hazard_checklist" TO qhse_app;

ALTER TABLE "gas_test_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gas_test_results" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "gas_test_results"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "gas_test_results" TO qhse_app;

ALTER TABLE "isolation_loto_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "isolation_loto_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "isolation_loto_records"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "isolation_loto_records" TO qhse_app;

ALTER TABLE "work_permit_approvals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_permit_approvals" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "work_permit_approvals"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "work_permit_approvals" TO qhse_app;
