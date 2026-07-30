-- Task 2.2 — RLS untuk 4 dari 5 tabel baru (Modul 04, Regulatory & Compliance
-- Management). Pola standar (tenant_id NOT NULL).
--
-- regulatory_frameworks SENGAJA TIDAK — katalog GLOBAL platform (PRD §5
-- eksplisit "bukan tabel domain tenant, dikelola Super Admin Platform"),
-- TIDAK ADA tenant_id sama sekali, dikecualikan otomatis dari generic RLS
-- suite (0.3, introspeksi kolom tenant_id) tanpa whitelist manual — pola
-- PERSIS industry_templates (1.2) / subscription_plans (1.5).
ALTER TABLE "regulatory_register" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "regulatory_register" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "regulatory_register"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "regulatory_register" TO qhse_app;

ALTER TABLE "compliance_obligations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "compliance_obligations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "compliance_obligations"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "compliance_obligations" TO qhse_app;

ALTER TABLE "compliance_evaluations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "compliance_evaluations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "compliance_evaluations"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "compliance_evaluations" TO qhse_app;

ALTER TABLE "licenses_permits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "licenses_permits" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "licenses_permits"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "licenses_permits" TO qhse_app;
