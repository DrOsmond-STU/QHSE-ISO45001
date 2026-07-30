-- Task 3.7 — audit_log_trigger (0.13) dilekatkan ke seluruh 11 tabel baru,
-- pola PERSIS task 3.3/3.4/3.5/3.6.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "emergency_muster_points"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('muster_point_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "emergency_response_plans"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('emergency_response_plan_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "emergency_response_plan_steps"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('plan_step_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "emergency_response_teams"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('emergency_response_team_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "emergency_response_team_members"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('team_member_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "emergency_contacts"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('emergency_contact_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "emergency_drills"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('emergency_drill_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "drill_participation_logs"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('drill_participation_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "emergency_activations"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('emergency_activation_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "muster_point_checkins"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('muster_checkin_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "emergency_equipment_readiness_checklist"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('readiness_checklist_id');
