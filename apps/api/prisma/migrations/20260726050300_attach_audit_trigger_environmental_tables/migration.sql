-- Task 5.2 — audit_log_trigger (0.13) dilekatkan ke seluruh 7 tabel baru,
-- pola PERSIS task 3.3-5.1.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "environmental_aspects_impacts"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('aspect_impact_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "environmental_monitoring_records"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('monitoring_record_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "waste_manifest_records"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('waste_manifest_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "waste_generation_log"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('waste_generation_log_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "proper_self_assessment"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('proper_self_assessment_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "proper_self_assessment_criteria_scores"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('criteria_score_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "environmental_permits"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('environmental_permit_id');
