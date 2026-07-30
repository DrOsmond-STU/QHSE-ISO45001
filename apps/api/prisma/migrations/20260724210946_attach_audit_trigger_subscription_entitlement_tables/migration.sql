-- Task 1.5 — audit_log_trigger (0.13) dilekatkan ke subscription_plans
-- (katalog global, pola PERSIS industry_templates 1.2 — tenant_id=NULL di
-- system_audit_logs, actor_user_id tetap terisi dari
-- current_setting('app.current_user_id') kalau ada), tenant_subscriptions,
-- dan module_entitlements (keduanya lifecycle/override bermakna, layak
-- diaudit BR-04).
--
-- usage_counters SENGAJA TIDAK dilekatkan — snapshot murni system-generated
-- (job usage-counter-scan), tidak ada lifecycle/status bermakna utk
-- diaudit, pola sama locations/cost_centers/organization_charts (1.1) yang
-- juga ditunda dengan alasan sama.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "subscription_plans"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('subscription_plan_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "tenant_subscriptions"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('tenant_subscription_id');

CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "module_entitlements"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('module_entitlement_id');
