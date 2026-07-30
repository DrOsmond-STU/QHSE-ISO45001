-- Task 2.1 — audit_log_trigger (0.13) dilekatkan ke 5 dari 6 tabel DMS:
-- document_categories/documents/document_versions/document_distribution/
-- document_review_schedule — seluruhnya "low-frequency/high-signal user
-- action" (aksi Document Controller/Owner/HSE Manager eksplisit: create
-- kategori, submit versi, approve, distribusi, catat hasil review).
--
-- read_acknowledgement_logs SENGAJA TIDAK dilekatkan — baris HASIL EKSPANSI
-- OTOMATIS sistem per user target distribusi (bisa ratusan baris sekali
-- distribusi), tidak py created_by/updated_by/deleted_at sama sekali (lihat
-- banner comment model), pola PERSIS data_import_errors (1.6)/usage_counters
-- (1.5)/locations-cost_centers-organization_charts (1.1).
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "document_categories"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('document_category_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "documents"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('document_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "document_versions"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('document_version_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "document_distribution"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('document_distribution_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "document_review_schedule"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('review_schedule_id');
