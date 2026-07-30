-- Task 1.4 — melekatkan audit_log_trigger (0.13) ke delegation_of_authority
-- (perubahan status delegasi kritikal utk audit — siapa mendelegasikan apa
-- ke siapa, kapan) DAN workflow_delegations (mutasi assigned_to/delegated_to
-- workflow_tasks akibatnya perlu bisa ditelusuri balik lewat baris ini).
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "delegation_of_authority"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('delegation_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "workflow_delegations"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('delegation_id');
