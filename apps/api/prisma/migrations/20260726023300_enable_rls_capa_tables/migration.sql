-- Task 4.2 — RLS (TDD §5.2) utk 5 tabel baru, pola PERSIS
-- rls-policy.template.sql, tenant_id ada di seluruh tabel.

ALTER TABLE "capa_register" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "capa_register" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "capa_register"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "capa_register" TO qhse_app;

ALTER TABLE "capa_root_cause_analysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "capa_root_cause_analysis" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "capa_root_cause_analysis"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "capa_root_cause_analysis" TO qhse_app;

ALTER TABLE "capa_action_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "capa_action_plans" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "capa_action_plans"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "capa_action_plans" TO qhse_app;

ALTER TABLE "capa_effectiveness_verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "capa_effectiveness_verification" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "capa_effectiveness_verification"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "capa_effectiveness_verification" TO qhse_app;

ALTER TABLE "capa_approvals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "capa_approvals" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "capa_approvals"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "capa_approvals" TO qhse_app;
