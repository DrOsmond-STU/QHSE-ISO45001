-- Task 1.3 — melekatkan audit_log_trigger() (0.13) ke tabel identitas/RBAC
-- yang task ini BARU membangun write service sungguhannya (UserService,
-- RoleService) — pola sama task 1.1 (trigger dilekatkan ke tabel yang CRUD
-- aktif dibangun task itu, bukan ke seluruh tabel Phase 0 sekaligus).
--
-- PRD Modul 02 §11 eksplisit: "Perubahan role_permissions dan user_roles
-- bersifat kontrol kritikal — wajib tercatat immutable di
-- system_audit_logs, termasuk before_value/after_value" — role_permissions
-- dan user_roles karena itu WAJIB (bukan sekadar konsisten dgn pola 1.1),
-- users/roles/sso_mappings turut disertakan (CRUD aktif dibangun task ini
-- juga, security-relevant sama tingkatnya).
--
-- permissions/permission_groups (katalog global platform, task 0.8) SENGAJA
-- BELUM dilekatkan — tidak ada write service aktif dibangun task ini
-- (hanya dikonsumsi via role_permissions + seed script), pola sama
-- industry_templates (1.2) yang HANYA dapat trigger karena
-- IndustryTemplateService.create/update/deactivate() aktif dibangun.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "users"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('user_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "roles"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('role_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "role_permissions"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('role_permission_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "user_roles"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('user_role_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "sso_mappings"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('sso_mapping_id');
