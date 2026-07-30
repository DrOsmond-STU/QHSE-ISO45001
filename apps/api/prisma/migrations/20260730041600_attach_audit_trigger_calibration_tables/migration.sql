-- Task 6.2 — audit_log_trigger (0.13) dilekatkan ke SEMUA 5 tabel baru
-- Modul 16 (Calibration Management), pola PERSIS 4.1-6.1. TIDAK ada
-- pengecualian di modul ini.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "calibration_items"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('calibration_item_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "calibration_providers"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('calibration_provider_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "calibration_schedules"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('calibration_schedule_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "calibration_certificates"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('calibration_certificate_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "out_of_tolerance_records"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('oot_record_id');
