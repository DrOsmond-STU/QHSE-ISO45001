-- Task 0.13 — system_audit_logs dipartisi bulanan (Master PRD §11.6, TDD
-- §6.1). Baseline auto-generated Prisma (`prisma migrate dev --create-only`)
-- HAND-EDITED di bawah ini — Prisma tidak mengerti PARTITION BY maupun
-- trigger, jadi CREATE TABLE aslinya diedit langsung (bukan cuma ditambah
-- migration terpisah sesudahnya seperti pola RLS biasa).
CREATE TABLE "system_audit_logs" (
    "log_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "actor_user_id" UUID,
    "action" VARCHAR(20) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID,
    "before_value" JSONB,
    "after_value" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "correlation_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_audit_logs_pkey" PRIMARY KEY ("log_id","created_at")
) PARTITION BY RANGE ("created_at");

-- Partisi awal: bulan berjalan + 1 bulan ke depan (skema deploy per
-- 2026-07-24). Partisi selanjutnya dibuat RUNTIME oleh job
-- audit-log-partition-maintenance (cron bulanan, TDD §13.1) — lihat
-- audit-log/audit-log-partition-maintenance.service.ts. INSERT ke
-- system_audit_logs TANPA partisi yang cocok akan GAGAL (perilaku native
-- declarative partitioning Postgres) — makanya minimal 1 partisi WAJIB ada
-- sebelum trigger di bawah pernah dipakai.
CREATE TABLE "system_audit_logs_y2026m07" PARTITION OF "system_audit_logs"
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE "system_audit_logs_y2026m08" PARTITION OF "system_audit_logs"
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- CreateTable
CREATE TABLE "_audit_log_smoke_test" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "label" TEXT,

    CONSTRAINT "_audit_log_smoke_test_pkey" PRIMARY KEY ("id")
);

-- CreateIndex — pada tabel partisi, index di parent OTOMATIS diturunkan ke
-- SELURUH partisi (baik yang sudah ada MAUPUN yang dibuat belakangan oleh
-- job maintenance) — dibuktikan lokal, beda dgn RLS/privilege di bawah yang
-- TIDAK ikut turun otomatis.
CREATE INDEX "system_audit_logs_tenant_id_created_at_idx" ON "system_audit_logs"("tenant_id", "created_at");
CREATE INDEX "system_audit_logs_entity_type_entity_id_idx" ON "system_audit_logs"("entity_type", "entity_id");
CREATE INDEX "system_audit_logs_actor_user_id_idx" ON "system_audit_logs"("actor_user_id");

-- ── audit_log_capture(): trigger generik "observer global" append-only ──
--
-- KENAPA TRIGGER, BUKAN Prisma Client Extension ($extends) — dibuktikan
-- EMPIRIS selama development task 0.13 (didokumentasikan TDD §26): extension
-- query hook Prisma HANYA dikasih {model, operation, args, query} — TIDAK
-- ADA akses ke transactional client (tx) yang sedang berjalan. Side-effect
-- insert yang ditulis dari client closure (bukan tx yang sama) COMMIT
-- independen/auto-commit — dibuktikan lewat test lokal: transaksi yang
-- sengaja di-ROLLBACK tetap MENYISAKAN baris "audit" yang ditulis extension,
-- padahal baris utamanya sendiri lenyap. Artinya audit log via Prisma
-- extension BISA BERBOHONG (mencatat perubahan yang sebenarnya batal) —
-- tidak bisa dipakai untuk "Entri audit tidak bisa diedit/dihapus" yang
-- WAJIB akurat. Trigger Postgres native dijamin atomic dengan statement
-- pemicunya (bagian fundamental transaksi RDBMS) — dibuktikan ulang lokal:
-- UPDATE dalam transaksi yang di-ROLLBACK tidak menyisakan baris audit sama
-- sekali; UPDATE yang di-COMMIT menghasilkan before_value/after_value akurat.
--
-- SECURITY DEFINER (owner: role migrasi/admin yang menjalankan migration
-- ini, BUKAN qhse_app) — trigger tetap bisa menulis ke system_audit_logs
-- TANPA bergantung pada grant qhse_app di tabel ini sama sekali
-- (defense-in-depth, dibuktikan lokal: INSERT via trigger tetap berhasil
-- walau qhse_app punya ZERO privilege langsung di tabel audit).
--
-- PK column TIDAK ditebak via introspeksi pg_index — Master PRD §11 poin 1
-- mewajibkan PK bernama "{entity}_id" tapi nama kolom FISIKNYA beda per
-- tabel (mis. workflow_definition_id, session_id — lihat @map di
-- schema.prisma), jadi disuplai sebagai trigger ARGUMENT (TG_ARGV[0]) oleh
-- CREATE TRIGGER masing-masing tabel (lebih eksplisit & lebih murah
-- daripada query katalog tiap kali trigger jalan). Kalau argumennya salah
-- (typo/kolom bukan UUID), entity_id jatuh ke NULL (bukan menggagalkan
-- seluruh operasi bisnis yang memicunya) — action/entity_type/before/after
-- tetap tercatat benar.
CREATE OR REPLACE FUNCTION audit_log_capture() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pk_column text := TG_ARGV[0];
  v_row jsonb;
  v_entity_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := to_jsonb(OLD);
  ELSE
    v_row := to_jsonb(NEW);
  END IF;

  BEGIN
    v_entity_id := (v_row ->> v_pk_column)::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_entity_id := NULL;
  END;

  INSERT INTO system_audit_logs (
    tenant_id, actor_user_id, action, entity_type, entity_id,
    before_value, after_value, ip_address, user_agent, correlation_id
  ) VALUES (
    NULLIF(current_setting('app.current_tenant_id', true), '')::uuid,
    NULLIF(current_setting('app.current_user_id', true), '')::uuid,
    TG_OP,
    TG_TABLE_NAME,
    v_entity_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) ELSE NULL END,
    NULLIF(current_setting('app.current_ip_address', true), ''),
    NULLIF(current_setting('app.current_user_agent', true), ''),
    NULLIF(current_setting('app.current_correlation_id', true), '')
  );

  RETURN NULL;
END;
$$;

-- Dipasang ke _audit_log_smoke_test SEKARANG (proof + integration test task
-- 0.13) — tabel domain Phase 1+ melekatkannya sendiri via satu baris
-- CREATE TRIGGER yang sama, lihat audit-log/audit-log-trigger.template.sql.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON "_audit_log_smoke_test"
FOR EACH ROW EXECUTE FUNCTION audit_log_capture('id');
