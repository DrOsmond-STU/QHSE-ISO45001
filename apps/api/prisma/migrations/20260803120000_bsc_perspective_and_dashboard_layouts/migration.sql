-- Dashboard analitik + Balanced Scorecard yang susunannya diatur pengguna.
--
-- Dua hal yang ditambahkan di sini, dan keduanya sengaja MENUMPANG pada yang
-- sudah ada alih-alih membuat dunia baru di sebelahnya:
--
-- 1. Perspektif Balanced Scorecard pada quality_objectives.
--    Balanced Scorecard bukan jenis data baru — ia cara MENGELOMPOKKAN
--    sasaran yang sudah wajib ada menurut ISO 9001 klausul 6.2, dan
--    quality_objectives sudah memuat persis yang dibutuhkan sebuah KPI
--    scorecard: nama metrik, target, baseline, capaian berjalan, satuan,
--    ambang "berisiko", frekuensi pengukuran, pemilik, dan periode. Membuat
--    tabel bsc_kpis tersendiri berarti dua tempat menyimpan sasaran
--    perusahaan yang sama, dan cepat atau lambat keduanya berbeda isi.
--
--    bsc_perspective dibuat NULLABLE dengan sengaja: sasaran mutu yang sudah
--    ada tidak otomatis punya perspektif, dan memaksakan nilai bawaan berarti
--    menaruh sasaran di kuadran yang belum tentu benar. Yang belum
--    dipetakan ditampilkan terpisah, bukan diam-diam dimasukkan ke salah satu
--    perspektif.
--
--    bsc_weight_percentage adalah bobot KPI DI DALAM perspektifnya. Tanpa
--    bobot, skor perspektif hanya rata-rata polos, sehingga "jumlah pelatihan
--    terlaksana" menimbang sama berat dengan "angka kecelakaan hilang hari
--    kerja" — dan itu bukan scorecard, itu daftar.
--
-- 2. dashboard_layouts — susunan widget milik SETIAP PENGGUNA.
--    Mengikuti pola notification_preferences: satu baris per (pengguna,
--    kunci dashboard), tenant_id ikut disimpan supaya RLS bisa menegakkan
--    isolasi di lapisan basis data, bukan di lapisan aplikasi.
--
--    TIDAK dilekati audit_log_trigger, berbeda dari notification_preferences.
--    Itu keputusan sadar: audit log adalah bukti kepatuhan, sementara posisi
--    sebuah widget tidak punya makna kepatuhan sama sekali. Trigger itu
--    menulis citra jsonb sebelum-dan-sesudah pada SETIAP pergeseran widget,
--    dan tabel audit_log dipartisi per bulan — membanjirinya dengan riwayat
--    tata letak membuat penelusuran kejadian yang benar-benar penting jadi
--    lebih mahal, tanpa satu pun manfaat audit.

-- --------------------------------------------------------------------------
-- 1. Perspektif Balanced Scorecard
-- --------------------------------------------------------------------------

CREATE TYPE "BalancedScorecardPerspective" AS ENUM (
  'FINANCIAL',
  'CUSTOMER',
  'INTERNAL_PROCESS',
  'LEARNING_GROWTH'
);

ALTER TABLE "quality_objectives"
  ADD COLUMN "bsc_perspective" "BalancedScorecardPerspective",
  ADD COLUMN "bsc_weight_percentage" DECIMAL(5,2);

-- Dipakai halaman scorecard: seluruh sasaran satu tenant, dikelompokkan per
-- perspektif. tenant_id di depan karena setiap query SELALU menyaringnya
-- lebih dulu (RLS memastikan itu).
CREATE INDEX "quality_objectives_tenant_id_bsc_perspective_idx"
  ON "quality_objectives"("tenant_id", "bsc_perspective");

-- --------------------------------------------------------------------------
-- 2. Tata letak dashboard per pengguna
-- --------------------------------------------------------------------------

CREATE TABLE "dashboard_layouts" (
  "dashboard_layout_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  -- 'analytics' | 'scorecard'. Sengaja VARCHAR, bukan enum: menambah jenis
  -- dashboard baru nanti tidak boleh menuntut migrasi basis data.
  "dashboard_key" VARCHAR(50) NOT NULL,
  -- Daftar widget beserta urutan, lebar, dan setelan masing-masing. Bentuknya
  -- divalidasi di lapisan aplikasi; basis data hanya menjamin ini JSON yang
  -- sah, karena katalog widget berubah mengikuti kode, bukan mengikuti skema.
  "layout" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Tanpa DEFAULT, mengikuti konvensi seluruh skema ini: updated_at diisi
  -- oleh penulisnya (@updatedAt di sisi Prisma, kolom eksplisit di sisi SQL
  -- mentah), bukan oleh basis data. Memberinya DEFAULT membuat baris yang
  -- lupa mengisinya tampak "baru diperbarui" padahal tidak pernah disentuh.
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "dashboard_layouts_pkey" PRIMARY KEY ("dashboard_layout_id")
);

CREATE UNIQUE INDEX "dashboard_layouts_user_id_dashboard_key_key"
  ON "dashboard_layouts"("user_id", "dashboard_key");

CREATE INDEX "dashboard_layouts_tenant_id_idx"
  ON "dashboard_layouts"("tenant_id");

ALTER TABLE "dashboard_layouts"
  ADD CONSTRAINT "dashboard_layouts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- ON DELETE CASCADE, berbeda dari FK tenant di atas: kalau seorang pengguna
-- dihapus, susunan widget miliknya tidak punya arti apa pun lagi dan tidak
-- boleh menghalangi penghapusan itu.
ALTER TABLE "dashboard_layouts"
  ADD CONSTRAINT "dashboard_layouts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "dashboard_layouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dashboard_layouts" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "dashboard_layouts"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "dashboard_layouts" TO qhse_app$sql$; END IF; END $$;
