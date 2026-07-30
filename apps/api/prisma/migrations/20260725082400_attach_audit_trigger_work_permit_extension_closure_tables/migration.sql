-- Task 3.4 — audit_log_trigger (0.13) dilekatkan ke kedua tabel baru,
-- pola PERSIS task 3.3.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "work_permit_extensions"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('work_permit_extension_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "work_permit_closures"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('work_permit_closure_id');
