-- Nilai enum modul pelatihan diseragamkan ke bahasa Inggris.
--
-- KENAPA DIUBAH, PADAHAL BARU DIBUAT BEBERAPA JAM LALU.
--
-- Seluruh enum di skema ini bernilai bahasa Inggris — DRAFT, APPROVED,
-- LOST_TIME_INJURY, EFFECTIVE_CLOSED. Enum pelatihan dibuat berbahasa
-- Indonesia (INDUKSI_K3, SERTIFIKASI_WAJIB, LULUS), dan itu keliru bukan
-- karena bahasa Inggris lebih baik, melainkan karena antarmuka MEMANUSIAKAN
-- kode enum apa adanya: `humanizeEnum("SERTIFIKASI_WAJIB")` menghasilkan
-- "Sertifikasi wajib" — dan itulah yang muncul di kolom "Type" pada
-- antarmuka berbahasa Inggris, di antara "Draft" dan "Completed" yang
-- berbahasa Inggris.
--
-- Menambal dengan kamus terjemahan justru memperburuk: nilai enum adalah
-- KODE, bukan teks tampilan, dan kode yang harus diterjemahkan sebelum
-- ditampilkan menuntut setiap tempat baru yang menampilkannya ingat
-- melakukannya. Menyeragamkan kodenya menghapus persoalannya.
--
-- ALTER TYPE ... RENAME VALUE mengubah katalog tipe di tempat: baris yang
-- sudah ada ikut terbaca dengan nama baru, tidak ada data yang ditulis
-- ulang, dan tidak ada penyemaian ulang yang diperlukan.

ALTER TYPE "TrainingType" RENAME VALUE 'INDUKSI_K3' TO 'INDUCTION';
ALTER TYPE "TrainingType" RENAME VALUE 'SERTIFIKASI_WAJIB' TO 'MANDATORY_CERTIFICATION';
ALTER TYPE "TrainingType" RENAME VALUE 'KOMPETENSI_TEKNIS' TO 'TECHNICAL_COMPETENCY';
ALTER TYPE "TrainingType" RENAME VALUE 'PENYEGARAN' TO 'REFRESHER';
ALTER TYPE "TrainingType" RENAME VALUE 'SIMULASI_TANGGAP_DARURAT' TO 'EMERGENCY_DRILL';
ALTER TYPE "TrainingType" RENAME VALUE 'SEMINAR_EKSTERNAL' TO 'EXTERNAL_SEMINAR';
-- AWARENESS sudah bahasa Inggris.

ALTER TYPE "TrainingEffectiveness" RENAME VALUE 'BELUM_DIEVALUASI' TO 'NOT_EVALUATED';
ALTER TYPE "TrainingEffectiveness" RENAME VALUE 'EFEKTIF' TO 'EFFECTIVE';
ALTER TYPE "TrainingEffectiveness" RENAME VALUE 'SEBAGIAN_EFEKTIF' TO 'PARTIALLY_EFFECTIVE';
ALTER TYPE "TrainingEffectiveness" RENAME VALUE 'TIDAK_EFEKTIF' TO 'NOT_EFFECTIVE';

ALTER TYPE "TrainingAttendance" RENAME VALUE 'HADIR' TO 'ATTENDED';
ALTER TYPE "TrainingAttendance" RENAME VALUE 'SEBAGIAN' TO 'PARTIAL';
ALTER TYPE "TrainingAttendance" RENAME VALUE 'TIDAK_HADIR' TO 'ABSENT';

ALTER TYPE "TrainingParticipantResult" RENAME VALUE 'LULUS' TO 'PASSED';
ALTER TYPE "TrainingParticipantResult" RENAME VALUE 'TIDAK_LULUS' TO 'FAILED';
ALTER TYPE "TrainingParticipantResult" RENAME VALUE 'BELUM_DINILAI' TO 'NOT_ASSESSED';

-- Nilai bawaan kolom menyebut nama lama secara harfiah, jadi harus ditulis
-- ulang. Tanpa langkah ini, INSERT tanpa kolom tersebut gagal dengan galat
-- yang menyebut nilai enum yang sudah tidak ada.
ALTER TABLE "training_realizations" ALTER COLUMN "effectiveness" SET DEFAULT 'NOT_EVALUATED';
ALTER TABLE "training_participants" ALTER COLUMN "attendance" SET DEFAULT 'ATTENDED';
ALTER TABLE "training_participants" ALTER COLUMN "result" SET DEFAULT 'NOT_ASSESSED';
