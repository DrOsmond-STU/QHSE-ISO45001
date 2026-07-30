-- Task 3.2 — audit_log_trigger (0.13) dilekatkan ke SEMUA 11 tabel baru.
-- jsa_job_steps/jsa_step_hazards/hiradc_lines py audit minimal/ringkas
-- (lihat banner comment schema.prisma) TAPI TETAP baris EKSPLISIT hasil
-- input user (Wizard HIRA/JSA §12, form HIRADC lapangan) — bukan ekspansi
-- otomatis sistem, pola PERSIS risk_matrix_levels/cells (task 3.1).
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "hira_assessments"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('hira_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "hira_team_members"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('hira_team_member_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "hira_hazard_lines"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('hira_line_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "jsa_records"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('jsa_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "jsa_job_steps"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('jsa_step_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "jsa_step_hazards"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('jsa_step_hazard_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "jsa_crew_acknowledgements"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('ack_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "hiradc_records"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('hiradc_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "hiradc_lines"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('hiradc_line_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "risk_register"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('risk_register_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "risk_treatment_plans"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('risk_treatment_id');
