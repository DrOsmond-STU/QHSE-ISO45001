-- Task 1.5 — RLS untuk 3 dari 4 tabel baru (Modul 31, provisioning &
-- entitlement). Pola standar (tenant_id NOT NULL), identik task 1.1-1.4.
--
-- subscription_plans SENGAJA TIDAK dapat RLS di sini — katalog GLOBAL
-- platform (PRD Modul 31 §5 eksplisit "platform-level, bukan per tenant"),
-- TIDAK PUNYA kolom tenant_id sama sekali, pola PERSIS industry_templates
-- (1.2). Generic RLS suite (0.3) otomatis mengecualikannya.
ALTER TABLE "tenant_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_subscriptions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "tenant_subscriptions"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "tenant_subscriptions" TO qhse_app;

ALTER TABLE "module_entitlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "module_entitlements" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "module_entitlements"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "module_entitlements" TO qhse_app;

ALTER TABLE "usage_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_counters" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "usage_counters"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "usage_counters" TO qhse_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON "subscription_plans" TO qhse_app;
