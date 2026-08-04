-- Statistik HSE per bulan — angka yang TIDAK bisa dihitung dari rekaman.
--
-- KENAPA TABEL BARU, PADAHAL ADA 162 MODEL LAIN.
--
-- Dashboard eksekutif HSE mana pun berdiri di atas dua besaran yang tidak
-- dihasilkan oleh proses QHSE mana pun di aplikasi ini: JAM KERJA (manhours)
-- dan JUMLAH TENAGA KERJA. Keduanya datang dari absensi dan penggajian, bukan
-- dari laporan insiden atau inspeksi.
--
-- Tanpa keduanya, indikator yang paling banyak diminta manajemen tidak bisa
-- dihitung sama sekali:
--
--     LTIFR = jumlah kecelakaan hilang hari kerja x 1.000.000 / jam kerja
--     TRIR  = jumlah kasus tercatat x 1.000.000 / jam kerja
--
-- Angka kecelakaan tanpa pembagi jam kerja tidak bisa dibandingkan antar
-- periode maupun antar lokasi: 3 kecelakaan pada 200.000 jam kerja dan 3
-- kecelakaan pada 2.000.000 jam kerja adalah dua keadaan yang sama sekali
-- berbeda. Menampilkan jumlah mentahnya saja, lalu menyebutnya "kinerja K3",
-- adalah cara paling umum membuat dashboard yang terlihat meyakinkan dan
-- menyesatkan pembacanya.
--
-- Pilihannya ada dua: mengarang jam kerja supaya rumusnya jalan, atau
-- menyediakan tempat untuk mengisinya. Yang pertama menghasilkan LTIFR yang
-- tampak sah di layar dan tidak berarti apa-apa. Tabel ini adalah yang kedua.
--
-- LEADING INDICATOR IKUT DI SINI, DAN BUKAN KARENA KEBETULAN SATU BENTUK.
-- Induksi keselamatan, toolbox talk, rapat HSE, dan jam pelatihan adalah
-- kegiatan yang DIHITUNG per periode, bukan direkam satu per satu sebagai
-- kasus. Memaksakan satu tabel rekaman untuk tiap toolbox talk berarti
-- menuntut ribuan baris entri yang tidak akan pernah diisi siapa pun, lalu
-- menampilkan angka nol dan menyebutnya kinerja.
--
-- site_id NULLABLE: statistik boleh diisi per lokasi atau untuk seluruh
-- perusahaan (NULL). Pola scope longgar yang sama dipakai `documents`.

CREATE TABLE "hse_period_statistics" (
  "hse_period_statistic_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "site_id" UUID,

  -- Tanggal 1 bulan yang bersangkutan. DATE, bukan (tahun, bulan) terpisah:
  -- seluruh metrik lain di aplikasi ini menyaring periode dengan rentang
  -- tanggal, dan kolom tanggal bisa langsung ikut rentang itu tanpa
  -- penyusunan ulang di setiap kueri.
  "period_month" DATE NOT NULL,

  -- --- pembagi ---
  "manpower" INTEGER NOT NULL DEFAULT 0,
  -- BIGINT: satu proyek besar melewati 2 miliar jam kerja kumulatif dalam
  -- hitungan tahun, dan INTEGER akan meluap tanpa suara.
  "manhours" BIGINT NOT NULL DEFAULT 0,

  -- --- leading indicator ---
  "safety_inductions" INTEGER NOT NULL DEFAULT 0,
  "toolbox_talks" INTEGER NOT NULL DEFAULT 0,
  "hse_meetings" INTEGER NOT NULL DEFAULT 0,
  "training_hours" INTEGER NOT NULL DEFAULT 0,
  "management_walkthroughs" INTEGER NOT NULL DEFAULT 0,
  "safety_observations" INTEGER NOT NULL DEFAULT 0,
  "unsafe_acts" INTEGER NOT NULL DEFAULT 0,
  "unsafe_conditions" INTEGER NOT NULL DEFAULT 0,

  "notes" TEXT,

  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "updated_by" UUID,
  "deleted_at" TIMESTAMPTZ,

  CONSTRAINT "hse_period_statistics_pkey" PRIMARY KEY ("hse_period_statistic_id")
);

-- Satu baris per (tenant, lokasi, bulan).
--
-- COALESCE pada site_id disengaja: di Postgres, NULL tidak sama dengan NULL,
-- sehingga UNIQUE biasa akan mengizinkan BANYAK baris "seluruh perusahaan"
-- untuk bulan yang sama — persis duplikasi yang paling mudah terjadi dan
-- paling sulit disadari, karena dashboard akan menjumlahkan keduanya dan
-- melipatgandakan jam kerja.
CREATE UNIQUE INDEX "hse_period_statistics_tenant_site_month_key"
  ON "hse_period_statistics"("tenant_id", (COALESCE("site_id", '00000000-0000-0000-0000-000000000000'::uuid)), "period_month");

CREATE INDEX "hse_period_statistics_tenant_id_period_month_idx"
  ON "hse_period_statistics"("tenant_id", "period_month");

ALTER TABLE "hse_period_statistics"
  ADD CONSTRAINT "hse_period_statistics_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "hse_period_statistics"
  ADD CONSTRAINT "hse_period_statistics_site_id_fkey"
  FOREIGN KEY ("site_id") REFERENCES "sites"("site_id")
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "hse_period_statistics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hse_period_statistics" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "hse_period_statistics"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "hse_period_statistics" TO qhse_app$sql$; END IF; END $$;
