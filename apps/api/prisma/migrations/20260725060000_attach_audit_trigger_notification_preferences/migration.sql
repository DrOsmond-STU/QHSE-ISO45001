-- Task 1.7 — audit_log_trigger (0.13) dilekatkan RETROAKTIF ke
-- notification_preferences, tabel yang SUDAH ada sejak task 0.11 tapi
-- BELUM pernah diaudit krn 0.11 hanya membangun sisi enqueue()/delivery,
-- BUKAN endpoint HTTP yang benar-benar membuatnya user-editable.
-- notification_preferences sekarang genuinely bisa diubah user lewat
-- PUT /notifications/preferences (task 1.7) — perubahan preferensi
-- (mis. mematikan channel WhatsApp utk kategori INCIDENT) bersifat
-- LOW-FREQUENCY & HIGH-SIGNAL (relevan investigasi "kenapa user X tidak
-- menerima alert Y"), layak diaudit — pola sama tenant_subscriptions (1.5).
--
-- notifications/notification_logs SENGAJA TIDAK dilekatkan trigger di sini
-- (di luar scope migration ini) — notifications.is_read/read_at berubah
-- SANGAT SERING (tiap kali user membuka notifikasi), audit trail per-baca
-- bernilai rendah dibanding overhead-nya (pola sama usage_counters 1.5/
-- data_import_errors 1.6: system-generated/high-frequency, bukan
-- keputusan admin yang jarang & bermakna); notification_logs murni
-- system-generated (hasil job delivery), tidak ada aksi user langsung.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "notification_preferences"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('notification_preference_id');
