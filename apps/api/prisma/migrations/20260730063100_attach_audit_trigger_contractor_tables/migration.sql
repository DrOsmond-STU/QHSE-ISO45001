-- Task 6.3 — audit_log_trigger (0.13) dilekatkan ke SEMUA 7 tabel baru
-- Modul 17 (Contractor Management), pola PERSIS 4.1-6.2. TIDAK ada
-- pengecualian di modul ini.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "contractors"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('contractor_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "contractor_prequalification"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('prequalification_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "contractor_prequalification_documents"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('pq_document_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "contractor_document_compliance"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('compliance_document_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "contractor_workers"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('contractor_worker_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "contractor_project_assignments"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('assignment_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "contractor_performance_evaluations"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('evaluation_id');
