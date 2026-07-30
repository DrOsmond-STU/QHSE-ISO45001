-- Task 4.1 — audit_log_trigger (0.13) dilekatkan ke seluruh 11 tabel baru,
-- pola PERSIS task 3.3/3.4/3.5/3.6/3.7.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "audit_types"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('audit_type_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "audit_checklists"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('audit_checklist_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "audit_checklist_items"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('checklist_item_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "audit_programs"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('audit_program_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "audit_program_plan_items"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('plan_item_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "audits"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('audit_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "audit_team_members"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('audit_team_member_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "audit_auditee_scopes"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('auditee_scope_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "audit_findings"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('audit_finding_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "auditor_competency_records"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('competency_record_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "audit_reports"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('audit_report_id');
