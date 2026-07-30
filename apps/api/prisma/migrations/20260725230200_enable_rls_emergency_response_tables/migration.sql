-- Task 3.7 — RLS (TDD §5.2) utk 11 tabel baru, pola PERSIS
-- rls-policy.template.sql, tenant_id ada di seluruh tabel.

ALTER TABLE "emergency_muster_points" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "emergency_muster_points" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "emergency_muster_points"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "emergency_muster_points" TO qhse_app;

ALTER TABLE "emergency_response_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "emergency_response_plans" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "emergency_response_plans"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "emergency_response_plans" TO qhse_app;

ALTER TABLE "emergency_response_plan_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "emergency_response_plan_steps" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "emergency_response_plan_steps"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "emergency_response_plan_steps" TO qhse_app;

ALTER TABLE "emergency_response_teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "emergency_response_teams" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "emergency_response_teams"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "emergency_response_teams" TO qhse_app;

ALTER TABLE "emergency_response_team_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "emergency_response_team_members" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "emergency_response_team_members"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "emergency_response_team_members" TO qhse_app;

ALTER TABLE "emergency_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "emergency_contacts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "emergency_contacts"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "emergency_contacts" TO qhse_app;

ALTER TABLE "emergency_drills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "emergency_drills" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "emergency_drills"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "emergency_drills" TO qhse_app;

ALTER TABLE "drill_participation_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "drill_participation_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "drill_participation_logs"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "drill_participation_logs" TO qhse_app;

ALTER TABLE "emergency_activations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "emergency_activations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "emergency_activations"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "emergency_activations" TO qhse_app;

ALTER TABLE "muster_point_checkins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "muster_point_checkins" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "muster_point_checkins"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "muster_point_checkins" TO qhse_app;

ALTER TABLE "emergency_equipment_readiness_checklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "emergency_equipment_readiness_checklist" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "emergency_equipment_readiness_checklist"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "emergency_equipment_readiness_checklist" TO qhse_app;
