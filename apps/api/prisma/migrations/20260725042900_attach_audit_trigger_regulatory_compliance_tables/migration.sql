-- Task 2.2 — audit_log_trigger (0.13) dilekatkan ke SEMUA 5 tabel baru
-- (beda dari 2.1 yang mengecualikan 1 dari 6 — modul ini TIDAK punya tabel
-- "hasil ekspansi otomatis sistem" spt read_acknowledgement_logs). Seluruh
-- tabel di sini adalah aksi user eksplisit bermakna (kurasi register,
-- submit evaluasi, kelola izin) ATAU katalog global admin-managed
-- (regulatory_frameworks) — pola PERSIS industry_templates (1.2, tabel
-- PERTAMA tanpa tenant_id yang melekatkan trigger ini).
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "regulatory_frameworks"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('framework_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "regulatory_register"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('regulatory_register_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "compliance_obligations"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('obligation_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "compliance_evaluations"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('evaluation_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "licenses_permits"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('license_id');
