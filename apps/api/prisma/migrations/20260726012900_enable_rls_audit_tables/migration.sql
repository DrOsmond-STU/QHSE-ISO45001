-- Task 4.1 — RLS (TDD §5.2) utk 11 tabel baru, pola PERSIS
-- rls-policy.template.sql, tenant_id ada di seluruh tabel.

ALTER TABLE "audit_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_types" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "audit_types"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "audit_types" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "audit_checklists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_checklists" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "audit_checklists"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "audit_checklists" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "audit_checklist_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_checklist_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "audit_checklist_items"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "audit_checklist_items" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "audit_programs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_programs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "audit_programs"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "audit_programs" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "audit_program_plan_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_program_plan_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "audit_program_plan_items"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "audit_program_plan_items" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "audits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audits" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "audits"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "audits" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "audit_team_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_team_members" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "audit_team_members"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "audit_team_members" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "audit_auditee_scopes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_auditee_scopes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "audit_auditee_scopes"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "audit_auditee_scopes" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "audit_findings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_findings" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "audit_findings"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "audit_findings" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "auditor_competency_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auditor_competency_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "auditor_competency_records"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "auditor_competency_records" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "audit_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_reports" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "audit_reports"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "audit_reports" TO qhse_app$sql$; END IF; END $$;
