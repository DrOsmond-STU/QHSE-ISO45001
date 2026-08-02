-- Task 3.6 — RLS (TDD §5.2) utk 8 tabel baru, pola PERSIS
-- rls-policy.template.sql, tenant_id ada di seluruh tabel.

ALTER TABLE "inspection_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inspection_types" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "inspection_types"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "inspection_types" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "inspection_checklist_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inspection_checklist_templates" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "inspection_checklist_templates"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "inspection_checklist_templates" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "inspection_checklist_template_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inspection_checklist_template_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "inspection_checklist_template_items"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "inspection_checklist_template_items" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "inspection_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inspection_schedules" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "inspection_schedules"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "inspection_schedules" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "inspection_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inspection_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "inspection_records"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "inspection_records" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "inspection_record_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inspection_record_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "inspection_record_items"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "inspection_record_items" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "inspection_findings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inspection_findings" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "inspection_findings"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "inspection_findings" TO qhse_app$sql$; END IF; END $$;

ALTER TABLE "inspection_scores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inspection_scores" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "inspection_scores"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "inspection_scores" TO qhse_app$sql$; END IF; END $$;
