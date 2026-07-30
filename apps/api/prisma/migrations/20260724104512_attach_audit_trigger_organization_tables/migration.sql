-- Task 1.1 — melekatkan trigger audit_log_capture() (task 0.13, Master PRD
-- §11.6) ke tabel hierarki organisasi yang perubahan statusnya bermakna
-- audit (BR-03 cascade deactivate, BR-06 auto-archive scheduled job, BR-01
-- site lifecycle) — KONSUMEN PERTAMA prisma/audit-log-trigger.template.sql
-- di luar tabel uji _audit_log_smoke_test.
--
-- tenants/locations/cost_centers/organization_charts SENGAJA belum
-- dilekatkan (tidak ada perubahan status/lifecycle "bermakna" sekarang;
-- bisa ditambah task lain kapan saja lewat migration terpisah, satu baris
-- per tabel, tidak perlu ubah fungsi trigger-nya).
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "companies"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('company_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "branches"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('branch_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "sites"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('site_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "departments"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('department_id');
