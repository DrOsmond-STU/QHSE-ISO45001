-- Bugfix: occupational_disease_cases.case_number and clinic_visit_logs.visit_number
-- were globally UNIQUE instead of tenant-scoped, unlike every other
-- NumberingService-generated document number in this schema (work_permits.permit_number,
-- quality_ncr_records.ncr_number, waste_manifests.manifest_number, etc, which are
-- all @@unique([tenant_id, ...])). A global constraint means one tenant's legitimate
-- record creation can fail due to an unrelated tenant's data — a cross-tenant
-- isolation defect, not just a demo-reseed artifact.
DROP INDEX "occupational_disease_cases_case_number_key";
CREATE UNIQUE INDEX "occupational_disease_cases_tenant_id_case_number_key" ON "occupational_disease_cases"("tenant_id", "case_number");

DROP INDEX "clinic_visit_logs_visit_number_key";
CREATE UNIQUE INDEX "clinic_visit_logs_tenant_id_visit_number_key" ON "clinic_visit_logs"("tenant_id", "visit_number");
