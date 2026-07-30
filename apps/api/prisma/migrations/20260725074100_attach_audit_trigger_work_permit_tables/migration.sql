-- Task 3.3 — audit_log_trigger (0.13) dilekatkan ke SEMUA 6 tabel baru,
-- seluruhnya hasil input user langsung (bukan ekspansi otomatis sistem),
-- pola PERSIS task 3.1/3.2.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "work_permit_types"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('work_permit_type_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "work_permits"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('work_permit_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "work_permit_hazard_checklist"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('work_permit_hazard_checklist_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "gas_test_results"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('gas_test_result_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "isolation_loto_records"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('isolation_loto_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "work_permit_approvals"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('work_permit_approval_id');
