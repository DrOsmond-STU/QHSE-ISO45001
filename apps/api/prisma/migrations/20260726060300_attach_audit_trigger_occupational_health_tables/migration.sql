-- Task 5.3 — audit_log_trigger (0.13) dilekatkan ke 12 dari 13 tabel baru
-- + tenant_encryption_keys (platform/field-encryption, task 252) — pola
-- PERSIS 4.1-5.2. medical_record_access_logs SENGAJA TIDAK dilekatkan
-- (lihat banner comment blok model schema.prisma: tabel itu SENDIRI adalah
-- jejak audit, mengaudit-trail dirinya sendiri sirkular & tidak perlu).
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "medical_records"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('medical_record_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "mcu_schedules"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('mcu_schedule_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "mcu_results"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('mcu_result_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "fit_to_work_assessments"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('fit_to_work_assessment_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "occupational_disease_cases"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('pak_case_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "clinic_visit_logs"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('clinic_visit_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "health_surveillance_programs"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('health_surveillance_program_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "health_surveillance_enrollments"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('enrollment_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "restricted_duty_assignments"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('restricted_duty_assignment_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "occupational_health_authorized_users"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('authorization_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "health_data_consents"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('consent_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "health_data_subject_requests"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('subject_request_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "tenant_encryption_keys"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('tenant_encryption_key_id');
