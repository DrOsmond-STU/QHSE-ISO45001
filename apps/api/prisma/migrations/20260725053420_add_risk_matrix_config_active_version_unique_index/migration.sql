-- Task 3.1 (Modul 05 §5/BR-09) — "Hanya 1 versi aktif per (tenant_id,
-- applicable_module_scope)". Partial unique index (WHERE is_active) —
-- TIDAK bisa diekspresikan Prisma `@@unique` DSL biasa (Postgres tidak
-- men-dedup FALSE di unique index reguler), ditulis manual pola PERSIS
-- numbering_configs (0.10)/notification_templates (0.11).
CREATE UNIQUE INDEX "risk_matrix_configs_active_version_key" ON "risk_matrix_configs"("tenant_id", "applicable_module_scope") WHERE "is_active" = true;
