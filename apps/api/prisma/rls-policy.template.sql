-- RLS policy template (TDD §5.2, TASK_INSTRUCTION.md task 0.3).
--
-- NOT a real Prisma migration — kalau ditaruh sebagai folder di
-- prisma/migrations/ dengan nama non-timestamp, Prisma migrate akan gagal
-- parse riwayat migrasi. Ini cuma referensi copy-paste: setiap migration
-- yang menambah tabel domain baru WAJIB menyertakan 3 baris ini (ganti
-- <table_name>), lalu GRANT ke role runtime (qhse_app di lokal dev, role
-- aplikasi terkelola Vault/KMS di production — SECURITY.md).
--
-- Lihat contoh nyata: prisma/migrations/20260723114235_enable_rls_smoke_test/

ALTER TABLE "<table_name>" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "<table_name>" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "<table_name>"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "<table_name>" TO qhse_app;
