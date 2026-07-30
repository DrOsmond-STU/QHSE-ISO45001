-- Task 3.6 — audit_log_trigger (0.13) dilekatkan ke seluruh 8 tabel baru,
-- pola PERSIS task 3.3/3.4/3.5.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "inspection_types"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('inspection_type_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "inspection_checklist_templates"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('inspection_checklist_template_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "inspection_checklist_template_items"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('template_item_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "inspection_schedules"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('inspection_schedule_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "inspection_records"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('inspection_record_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "inspection_record_items"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('record_item_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "inspection_findings"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('inspection_finding_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "inspection_scores"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('inspection_score_id');
