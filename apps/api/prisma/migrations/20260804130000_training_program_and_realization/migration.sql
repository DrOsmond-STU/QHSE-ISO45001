-- Modul Pelatihan: PROGRAM (rencana) dan REALISASI (pelaksanaan).
--
-- KENAPA DUA TABEL, BUKAN SATU TABEL BERKOLOM "rencana" DAN "aktual".
--
-- Godaannya besar: satu tabel `trainings` dengan planned_date/actual_date,
-- planned_participants/actual_participants. Bentuk itu runtuh pada kejadian
-- yang paling biasa di lapangan:
--
--   1. Satu program dilaksanakan BERKALI-KALI. "Induksi K3 pekerja baru"
--      adalah satu baris rencana tahunan, tapi berjalan tiap bulan dengan
--      peserta berbeda. Pada satu tabel, angkatan kedua hanya bisa dicatat
--      dengan menimpa angkatan pertama, atau dengan menduplikasi seluruh
--      baris rencananya — dan begitu diduplikasi, "berapa program yang
--      direncanakan tahun ini" tidak bisa dijawab lagi.
--
--   2. Ada pelatihan yang TERJADI tanpa pernah direncanakan — pelatihan
--      dadakan setelah insiden, atau tawaran pelatihan gratis dari vendor.
--      Pada satu tabel, kejadian itu harus dicatat sebagai rencana yang
--      seolah-olah dibuat surut, dan tingkat pencapaian program langsung
--      menjadi bohong.
--
--   3. Ada rencana yang TIDAK PERNAH terlaksana. Itu bukan cacat data yang
--      perlu disembunyikan; justru itulah angka yang dicari auditor ISO
--      45001 klausul 7.2. Baris rencana harus tetap ada dan tetap kosong
--      realisasinya.
--
-- Karena itu: program 1..N realisasi, dan `training_program_id` pada
-- realisasi NULLABLE supaya kejadian nomor 2 punya tempat.
--
-- PESERTA JADI TABEL SENDIRI, bukan kolom cacah pada realisasi. Yang
-- ditanyakan auditor bukan "berapa orang hadir", melainkan "tunjukkan siapa
-- saja, dan mana sertifikatnya, dan kapan kedaluwarsa". Cacah tanpa daftar
-- nama tidak bisa menjawab itu, dan masa berlaku sertifikat per orang tidak
-- punya tempat sama sekali pada sebuah kolom INTEGER.

CREATE TYPE "TrainingType" AS ENUM (
  'INDUKSI_K3',
  'SERTIFIKASI_WAJIB',
  'KOMPETENSI_TEKNIS',
  'PENYEGARAN',
  'AWARENESS',
  'SIMULASI_TANGGAP_DARURAT',
  'SEMINAR_EKSTERNAL'
);

CREATE TYPE "TrainingDeliveryMethod" AS ENUM (
  'IN_HOUSE',
  'PUBLIC_CLASS',
  'ONLINE',
  'ON_THE_JOB',
  'BLENDED'
);

CREATE TYPE "TrainingProgramStatus" AS ENUM (
  'DRAFT',
  'APPROVED',
  'IN_PROGRESS',
  'COMPLETED',
  'DEFERRED',
  'CANCELLED'
);

CREATE TYPE "TrainingRealizationStatus" AS ENUM (
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'POSTPONED',
  'CANCELLED'
);

-- Evaluasi keefektifan, bukan sekadar "sudah/belum". ISO 45001 7.2 d)
-- meminta bukti bahwa pelatihannya BERHASIL, dan itu penilaian bertingkat.
CREATE TYPE "TrainingEffectiveness" AS ENUM (
  'BELUM_DIEVALUASI',
  'EFEKTIF',
  'SEBAGIAN_EFEKTIF',
  'TIDAK_EFEKTIF'
);

CREATE TYPE "TrainingAttendance" AS ENUM ('HADIR', 'SEBAGIAN', 'TIDAK_HADIR');

CREATE TYPE "TrainingParticipantResult" AS ENUM ('LULUS', 'TIDAK_LULUS', 'BELUM_DINILAI');

-- ===========================================================================
--  PROGRAM PELATIHAN — rencana
-- ===========================================================================
CREATE TABLE "training_programs" (
  "training_program_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "site_id" UUID,
  "department_id" UUID,

  "program_number" VARCHAR(50) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "training_type" "TrainingType" NOT NULL,
  "objective" TEXT,
  "target_audience" VARCHAR(200),

  -- Wajib menurut peraturan, dan peraturan mana. Dua kolom, bukan satu:
  -- boolean-nya yang dipakai menyaring "pelatihan wajib mana yang belum
  -- terlaksana", teksnya yang dipakai menjawab auditor "atas dasar apa".
  "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
  "regulatory_basis" VARCHAR(200),

  -- Rencana. planned_hours_per_participant NUMERIC karena pelatihan setengah
  -- hari (3,5 jam) lazim, dan INTEGER akan membulatkannya diam-diam.
  "planned_participants" INTEGER NOT NULL DEFAULT 0,
  "planned_hours_per_participant" NUMERIC(6, 2) NOT NULL DEFAULT 0,
  "planned_sessions" INTEGER NOT NULL DEFAULT 1,
  "planned_budget" NUMERIC(14, 2),

  "delivery_method" "TrainingDeliveryMethod" NOT NULL DEFAULT 'IN_HOUSE',
  "provider_name" VARCHAR(150),

  "planned_start_date" DATE,
  "planned_end_date" DATE,
  "fiscal_year" INTEGER NOT NULL,

  "certification_required" BOOLEAN NOT NULL DEFAULT false,
  "certificate_validity_months" INTEGER,

  "pic_user_id" UUID,
  "status" "TrainingProgramStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,

  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "updated_by" UUID,
  "deleted_at" TIMESTAMPTZ,

  CONSTRAINT "training_programs_pkey" PRIMARY KEY ("training_program_id")
);

-- Nomor program unik per tenant. TIDAK diberi saringan deleted_at: penghapusan
-- lunak di aplikasi ini tidak pernah membebaskan nomor — nomor yang dipakai
-- ulang membuat riwayat audit menunjuk dua baris berbeda.
CREATE UNIQUE INDEX "training_programs_tenant_id_program_number_key"
  ON "training_programs"("tenant_id", "program_number");

CREATE INDEX "training_programs_tenant_id_fiscal_year_idx"
  ON "training_programs"("tenant_id", "fiscal_year");

CREATE INDEX "training_programs_tenant_id_status_idx"
  ON "training_programs"("tenant_id", "status");

ALTER TABLE "training_programs"
  ADD CONSTRAINT "training_programs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "training_programs"
  ADD CONSTRAINT "training_programs_site_id_fkey"
  FOREIGN KEY ("site_id") REFERENCES "sites"("site_id")
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "training_programs"
  ADD CONSTRAINT "training_programs_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("department_id")
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "training_programs"
  ADD CONSTRAINT "training_programs_pic_user_id_fkey"
  FOREIGN KEY ("pic_user_id") REFERENCES "users"("user_id")
  ON UPDATE CASCADE ON DELETE SET NULL;

-- ===========================================================================
--  REALISASI PELATIHAN — pelaksanaan
-- ===========================================================================
CREATE TABLE "training_realizations" (
  "training_realization_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,

  -- NULLABLE dengan sengaja — lihat alasan nomor 2 di kepala berkas ini.
  "training_program_id" UUID,

  "site_id" UUID,
  "department_id" UUID,

  "realization_number" VARCHAR(50) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "training_type" "TrainingType" NOT NULL,

  "session_date" DATE NOT NULL,
  "session_end_date" DATE,
  "duration_hours" NUMERIC(6, 2) NOT NULL DEFAULT 0,

  "delivery_method" "TrainingDeliveryMethod" NOT NULL DEFAULT 'IN_HOUSE',
  "provider_name" VARCHAR(150),
  "trainer_name" VARCHAR(150),
  "location" VARCHAR(200),

  -- Cacah peserta DISIMPAN meskipun daftar pesertanya ada di tabel anak.
  -- Bukan redundansi yang ceroboh: pelatihan lama yang diimpor dari arsip
  -- kertas punya angka hadir tanpa daftar nama, dan memaksa daftar nama
  -- lengkap sebagai satu-satunya sumber berarti seluruh riwayat sebelum
  -- aplikasi ini dipakai tercatat sebagai nol peserta.
  "planned_participants" INTEGER NOT NULL DEFAULT 0,
  "actual_participants" INTEGER NOT NULL DEFAULT 0,
  "passed_participants" INTEGER NOT NULL DEFAULT 0,

  "actual_cost" NUMERIC(14, 2),

  "average_pre_test_score" NUMERIC(5, 2),
  "average_post_test_score" NUMERIC(5, 2),
  "effectiveness" "TrainingEffectiveness" NOT NULL DEFAULT 'BELUM_DIEVALUASI',
  "evaluation_method" VARCHAR(150),
  "evaluation_notes" TEXT,
  "evaluated_by" UUID,
  "evaluated_date" DATE,

  "certificate_issued" BOOLEAN NOT NULL DEFAULT false,

  "status" "TrainingRealizationStatus" NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,

  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "updated_by" UUID,
  "deleted_at" TIMESTAMPTZ,

  CONSTRAINT "training_realizations_pkey" PRIMARY KEY ("training_realization_id")
);

CREATE UNIQUE INDEX "training_realizations_tenant_id_realization_number_key"
  ON "training_realizations"("tenant_id", "realization_number");

CREATE INDEX "training_realizations_tenant_id_session_date_idx"
  ON "training_realizations"("tenant_id", "session_date");

CREATE INDEX "training_realizations_training_program_id_idx"
  ON "training_realizations"("training_program_id");

ALTER TABLE "training_realizations"
  ADD CONSTRAINT "training_realizations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- ON DELETE RESTRICT, bukan CASCADE: menghapus rencana tidak boleh ikut
-- menghapus bukti bahwa pelatihannya pernah dijalankan.
ALTER TABLE "training_realizations"
  ADD CONSTRAINT "training_realizations_training_program_id_fkey"
  FOREIGN KEY ("training_program_id") REFERENCES "training_programs"("training_program_id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "training_realizations"
  ADD CONSTRAINT "training_realizations_site_id_fkey"
  FOREIGN KEY ("site_id") REFERENCES "sites"("site_id")
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "training_realizations"
  ADD CONSTRAINT "training_realizations_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("department_id")
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "training_realizations"
  ADD CONSTRAINT "training_realizations_evaluated_by_fkey"
  FOREIGN KEY ("evaluated_by") REFERENCES "users"("user_id")
  ON UPDATE CASCADE ON DELETE SET NULL;

-- ===========================================================================
--  PESERTA PELATIHAN — anak dari realisasi
-- ===========================================================================
CREATE TABLE "training_participants" (
  "training_participant_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "training_realization_id" UUID NOT NULL,

  -- user_id NULLABLE dan participant_name TETAP WAJIB. Peserta pelatihan K3
  -- sering pekerja kontraktor yang tidak punya akun di aplikasi ini; memaksa
  -- FK ke users berarti mereka tidak bisa dicatat sama sekali, padahal
  -- justru merekalah yang paling sering ditanyakan saat audit CSMS.
  "user_id" UUID,
  "participant_name" VARCHAR(150) NOT NULL,
  "participant_company" VARCHAR(150),
  "participant_position" VARCHAR(100),

  "attendance" "TrainingAttendance" NOT NULL DEFAULT 'HADIR',
  "pre_test_score" NUMERIC(5, 2),
  "post_test_score" NUMERIC(5, 2),
  "result" "TrainingParticipantResult" NOT NULL DEFAULT 'BELUM_DINILAI',

  "certificate_number" VARCHAR(100),
  "certificate_issued_date" DATE,
  "certificate_expiry_date" DATE,

  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "updated_by" UUID,
  "deleted_at" TIMESTAMPTZ,

  CONSTRAINT "training_participants_pkey" PRIMARY KEY ("training_participant_id")
);

CREATE INDEX "training_participants_training_realization_id_idx"
  ON "training_participants"("training_realization_id");

CREATE INDEX "training_participants_tenant_id_user_id_idx"
  ON "training_participants"("tenant_id", "user_id");

-- Masa berlaku sertifikat per orang: inilah kolom yang menjawab "siapa yang
-- sertifikat ruang terbatasnya kedaluwarsa bulan depan".
CREATE INDEX "training_participants_tenant_id_certificate_expiry_date_idx"
  ON "training_participants"("tenant_id", "certificate_expiry_date");

ALTER TABLE "training_participants"
  ADD CONSTRAINT "training_participants_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "training_participants"
  ADD CONSTRAINT "training_participants_training_realization_id_fkey"
  FOREIGN KEY ("training_realization_id") REFERENCES "training_realizations"("training_realization_id")
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "training_participants"
  ADD CONSTRAINT "training_participants_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
  ON UPDATE CASCADE ON DELETE SET NULL;

-- ===========================================================================
--  Isolasi tenant
-- ===========================================================================
ALTER TABLE "training_programs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "training_programs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "training_programs"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

ALTER TABLE "training_realizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "training_realizations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "training_realizations"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

ALTER TABLE "training_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "training_participants" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "training_participants"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qhse_app') THEN
    EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "training_programs" TO qhse_app$sql$;
    EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "training_realizations" TO qhse_app$sql$;
    EXECUTE $sql$GRANT SELECT, INSERT, UPDATE, DELETE ON "training_participants" TO qhse_app$sql$;
  END IF;
END $$;
