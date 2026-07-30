-- Task 1.2 — melekatkan trigger audit_log_capture() (task 0.13) ke 3 tabel
-- baru (Modul 01, template industri & kalender).
--
-- industry_templates: tabel PERTAMA tanpa kolom tenant_id sama sekali yang
-- melekatkan trigger ini. Diverifikasi AMAN sebelum ditulis di sini (TDD
-- §26): audit_log_capture() TIDAK PERNAH membaca NEW.tenant_id/OLD.tenant_id
-- dari baris tabel sumbernya — ia menulis tenant_id ke system_audit_logs
-- dari session context (NULLIF(current_setting('app.current_tenant_id',
-- true),'')::uuid), BUKAN dari kolom row apa pun (lihat definisi fungsi,
-- migration 20260724092001_init_audit_log_tables). Karena
-- system_audit_logs.tenant_id sendiri NULLABLE (pola sama baris system
-- roles/role_permissions, task 0.8), trigger di tabel tanpa tenant_id sama
-- sekali tetap berfungsi normal — cukup menghasilkan entri audit dengan
-- tenant_id=NULL (semantik BENAR: perubahan katalog global, bukan
-- perubahan data satu tenant tertentu). actor_user_id (Super Admin
-- Platform yang mengubah katalog) tetap terekam dari
-- app.current_user_id seperti biasa. Layak dilekatkan karena
-- create/update/delete pada industry_templates berdampak ke SEMUA tenant
-- yang memakainya (Master PRD §11.6 poin 6: operasi create/update/delete
-- wajib tercatat) — beda dari tenants/locations/cost_centers/
-- organization_charts task 1.1 yang SENGAJA ditunda (belum ada
-- create/update/delete aktif dibangun task itu).
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "industry_templates"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('industry_template_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "holiday_calendars"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('holiday_calendar_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "holiday_calendar_entries"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('holiday_entry_id');
