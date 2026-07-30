-- Task 5.1 — audit_log_trigger (0.13) dilekatkan ke seluruh 7 tabel baru,
-- pola PERSIS task 3.3-4.2.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "ncr_records"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('ncr_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "customer_complaints"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('complaint_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "quality_inspections"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('quality_inspection_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "quality_inspection_parameters"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('inspection_parameter_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "supplier_quality_records"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('supplier_quality_record_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "quality_objectives"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('quality_objective_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "quality_objective_progress_logs"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('progress_log_id');
