import { ObjectStorageService } from "../../../../platform/attachment/object-storage.service";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { DataImportJobPayload } from "./data-import-job.types";
import { DataImportRowMapperRegistry } from "./row-mappers/data-import-row-mapper-registry.service";
/**
 * Sisi worker (dipanggil apps/worker/src/data-import.worker.ts, proses
 * TERPISAH dari apps/api — pola sama AttachmentScanService 0.12). Tenant
 * context di-set eksplisit dari job payload.
 */
export declare class DataImportProcessingService {
    private readonly prisma;
    private readonly storage;
    private readonly mapperRegistry;
    private readonly logger;
    constructor(prisma: PrismaService, storage: ObjectStorageService, mapperRegistry: DataImportRowMapperRegistry);
    process(jobName: string, payload: DataImportJobPayload): Promise<void>;
    /**
     * TDD §20 — tahap VALIDATING, MURNI read-only (tidak menyentuh tabel
     * domain). Kalau attachment masih PENDING_SCAN, THROW (BUKAN skip diam2)
     * supaya BullMQ retry+backoff (attempts tinggi, lihat
     * data-import.constants.ts) jadi mekanisme tunggu-hasil-scan-malware
     * tanpa infra polling terpisah.
     *
     * Guard HANYA "UPLOADED" (bukan lagi "UPLOADED atau VALIDATING") + KLAIM
     * ATOMIK (updateMany WHERE status='UPLOADED') tepat sebelum kerja
     * substantif dimulai — ditemukan EMPIRIS (dev environment ini punya
     * apps/worker sungguhan yang kadang berjalan paralel dgn test yang
     * memanggil processValidate()/processCommit() langsung, TIDAK bisa
     * diasumsikan absen) bahwa DUA invocation yang SAMA-SAMA melihat status
     * "VALIDATING" (retry BullMQ + panggilan lain yang overlap) akan
     * SAMA-SAMA mengulang parse+tulis data_import_errors kalau guard-nya
     * cuma baca status tanpa klaim — race classic time-of-check-time-of-use.
     * updateMany({where:{status:'UPLOADED'}}) atomik di level Postgres:
     * SIAPAPUN yang menang (count=1) SATU-SATUNYA yang lanjut; yang kalah
     * (count=0) berhenti tanpa efek samping apa pun. Konsekuensi: kalau
     * proses yang menang crash di tengah parse, job TERTAHAN permanen di
     * VALIDATING (tidak ada retry otomatis lagi setelah klaim berhasil) —
     * gap TDD §26, butuh job stalled-sweep terpisah utk pemulihan otomatis
     * yang di luar timebox task ini.
     */
    processValidate(payload: DataImportJobPayload): Promise<void>;
    /**
     * TDD §20 — tahap IMPORTING, "batch transaksi kecil (mis. 500 baris per
     * transaksi)". Lihat banner comment DataImportRowMapper.importRow() utk
     * kenapa "transaksi" di sini per-baris (via mapper, mis.
     * UserService.inviteUser() 1.3) bukan literal 1 transaksi Postgres per
     * 500 baris — DATA_IMPORT_BATCH_SIZE dipakai utk flush progress
     * (successRows/errorRows berjalan) tiap N baris, bukan batas transaksi.
     * Baris yang SUDAH diketahui invalid dari fase VALIDATING DILEWATI di
     * sini (sudah py data_import_errors, tidak diulang).
     */
    processCommit(payload: DataImportJobPayload): Promise<void>;
    private transition;
    /**
     * Versi ATOMIK dari transition() — `updateMany({where:{id,status:from}})`
     * bukan `update({where:{id}})` biasa: Postgres MENJAMIN hanya SATU
     * invocation yang bisa menang mengubah baris dari status `from` yang
     * SAMA (row-level lock inheren pada UPDATE), TERLEPAS dari nilai
     * `job.status` in-memory yang mungkin sudah basi di sisi caller manapun
     * yang overlap. Lihat banner comment processValidate() utk alasan
     * lengkap kenapa ini dibutuhkan.
     */
    private tryClaim;
    private failJob;
    private recordRowError;
    /**
     * TDD §20 bermaksud "parsing Excel dilakukan streaming (bukan load
     * seluruh file ke memori)" — literalnya dipenuhi lewat
     * `ExcelJS.stream.xlsx.WorkbookReader` di percobaan AWAL implementasi
     * ini, TAPI diverifikasi empiris TIDAK RELIABLE: dibuktikan lewat
     * pengulangan 5-10x membaca buffer HASIL WRITER exceljs SENDIRI (bukan
     * file eksternal aneh), gagal 60-90% percobaan dengan error internal
     * exceljs `Cannot read properties of undefined (reading 'sheets')`
     * (`workbook-reader.js` mengasumsikan entry `xl/workbook.xml` SELALU
     * tiba sebelum `xl/worksheets/sheet1.xml` di stream ZIP — asumsi yang
     * TIDAK dijamin writer exceljs sendiri, kemungkinan besar krn kompresi
     * internal tiap entry zip berjalan paralel/tidak berurutan). Baik lewat
     * stream S3 SDK maupun lewat file sementara di disk sama-sama gagal
     * dgn pola sama — root cause di reader-nya, bukan sumber input.
     * `Workbook.xlsx.load(buffer)` (non-streaming, API UTAMA exceljs yang
     * jauh lebih matang) TERBUKTI 100% reliable di percobaan berulang yang
     * sama, jadi DIPAKAI di sini sbg pengganti. Konsekuensinya: file Excel
     * DIMUAT PENUH ke memori (via ObjectStorageService.getObjectBuffer(),
     * bukan getObjectStream()) — TIDAK memenuhi TDD §20 secara literal utk
     * file yang genuinely sangat besar. Didokumentasikan eksplisit sbg gap
     * TDD §26 (bukan diam-diam menyimpang): true streaming (memori
     * terbatas independen ukuran file) butuh library lain atau parser
     * SAX/ZIP custom, di luar timebox task 1.6 begitu ketidakandalan
     * exceljs.stream ditemukan.
     *
     * Baris pertama sheet = header (dipetakan ke nama kolom secara
     * longgar — trim+lowercase+underscore, bukan exact-match kaku). Hanya
     * sheet PERTAMA dibaca (PRD/TDD tidak menyebut skenario multi-sheet).
     * Header sheet TIDAK divalidasi eksplisit terhadap mapper.columns (mis.
     * gagal cepat kalau template salah total) — kolom yang hilang tetap
     * bermuara jadi error PER-BARIS yang benar (field wajib kosong) lewat
     * mapper.validateRow(), cuma kurang eksplisit dibanding pesan "template
     * salah" tunggal; didokumentasikan gap TDD §26, bukan bug.
     */
    private forEachDataRow;
}
