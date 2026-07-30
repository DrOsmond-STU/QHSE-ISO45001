-- Task 1.6 — audit_log_trigger (0.13) dilekatkan ke data_import_jobs
-- (status transitions UPLOADED->...->COMPLETED/FAILED bermakna diaudit,
-- juga relevan langsung PRD §10 pemetaan UU PDP: "data_import_jobs
-- tercatat siapa yang inisiasi, apa yang diimpor") dan
-- tenant_branding_configs (config Tenant Admin-editable, lifecycle
-- create/update bermakna, pola sama tenant_subscriptions 1.5).
--
-- data_import_errors SENGAJA TIDAK dilekatkan — baris system-generated
-- murni (hasil proses parsing/import, bukan aksi user langsung terhadap
-- baris itu sendiri), tidak ada lifecycle/status bermakna utk diaudit,
-- pola sama usage_counters (1.5) / locations/cost_centers/organization_charts
-- (1.1).
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "data_import_jobs"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('data_import_job_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "tenant_branding_configs"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('tenant_branding_config_id');
