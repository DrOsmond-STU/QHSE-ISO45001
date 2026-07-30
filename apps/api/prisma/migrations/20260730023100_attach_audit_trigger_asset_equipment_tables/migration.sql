-- Task 6.1 — audit_log_trigger (0.13) dilekatkan ke SEMUA 5 tabel baru
-- Modul 15 (Asset & Equipment Management), pola PERSIS 4.1-5.3. TIDAK ada
-- pengecualian di modul ini (beda medical_record_access_logs 5.3) —
-- maintenance_records/asset_transfer_log historis TAPI bukan jejak audit
-- itu sendiri, jadi tetap layak diaudit trigger standar.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "asset_categories"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('asset_category_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "assets"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('asset_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "maintenance_schedules"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('maintenance_schedule_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "maintenance_records"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('maintenance_record_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "asset_transfer_log"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('transfer_id');
