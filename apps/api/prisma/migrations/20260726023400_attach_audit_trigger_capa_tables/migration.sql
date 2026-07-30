-- Task 4.2 — audit_log_trigger (0.13) dilekatkan ke seluruh 5 tabel baru,
-- pola PERSIS task 3.3/3.4/3.5/3.6/3.7/4.1.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "capa_register"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('capa_register_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "capa_root_cause_analysis"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('root_cause_analysis_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "capa_action_plans"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('capa_action_plan_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "capa_effectiveness_verification"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('effectiveness_verification_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "capa_approvals"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('capa_approval_id');
