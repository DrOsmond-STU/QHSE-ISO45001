-- Task 3.5 — audit_log_trigger (0.13) dilekatkan ke seluruh 8 tabel baru,
-- pola PERSIS task 3.3/3.4.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "incident_reports"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('incident_report_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "incident_investigations"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('incident_investigation_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "incident_investigation_team"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('incident_investigation_team_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "incident_root_causes"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('incident_root_cause_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "incident_corrective_actions"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('incident_corrective_action_link_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "incident_witness_statements"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('incident_witness_statement_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "incident_regulatory_reports"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('incident_regulatory_report_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "incident_statistics_cache"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('incident_statistics_cache_id');
