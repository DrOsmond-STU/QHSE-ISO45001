-- Task 3.1 — audit_log_trigger (0.13) dilekatkan ke SEMUA 4 tabel baru.
-- risk_matrix_levels/risk_matrix_cells BUKAN "hasil ekspansi otomatis
-- sistem" (beda dari read_acknowledgement_logs 2.1 yang dikecualikan) —
-- baris-baris ini adalah input EKSPLISIT Tenant Admin lewat Visual Builder
-- matriks (PRD §12), jadi tetap layak diaudit sama seperti parent-nya.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "risk_matrix_configs"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('risk_matrix_config_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "risk_matrix_levels"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('risk_matrix_level_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "risk_matrix_cells"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('risk_matrix_cell_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "hazard_register"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('hazard_id');
