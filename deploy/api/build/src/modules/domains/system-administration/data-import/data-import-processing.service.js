"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DataImportProcessingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataImportProcessingService = void 0;
const common_1 = require("@nestjs/common");
const ExcelJS = __importStar(require("exceljs"));
const object_storage_service_1 = require("../../../../platform/attachment/object-storage.service");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../../platform/tenancy/tenant-context");
const data_import_lifecycle_1 = require("./data-import-lifecycle");
const data_import_constants_1 = require("./data-import.constants");
const data_import_row_mapper_registry_service_1 = require("./row-mappers/data-import-row-mapper-registry.service");
/**
 * Sisi worker (dipanggil apps/worker/src/data-import.worker.ts, proses
 * TERPISAH dari apps/api — pola sama AttachmentScanService 0.12). Tenant
 * context di-set eksplisit dari job payload.
 */
let DataImportProcessingService = DataImportProcessingService_1 = class DataImportProcessingService {
    prisma;
    storage;
    mapperRegistry;
    logger = new common_1.Logger(DataImportProcessingService_1.name);
    constructor(prisma, storage, mapperRegistry) {
        this.prisma = prisma;
        this.storage = storage;
        this.mapperRegistry = mapperRegistry;
    }
    async process(jobName, payload) {
        if (jobName === data_import_constants_1.DATA_IMPORT_VALIDATE_JOB_NAME)
            return this.processValidate(payload);
        if (jobName === data_import_constants_1.DATA_IMPORT_COMMIT_JOB_NAME)
            return this.processCommit(payload);
        throw new Error(`Job name data-import tidak dikenal: "${jobName}".`);
    }
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
    async processValidate(payload) {
        const job = await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, () => this.prisma.withRls((tx) => tx.dataImportJob.findUniqueOrThrow({ where: { id: payload.dataImportJobId } })));
        if (job.status !== "UPLOADED") {
            return;
        }
        // userId=job.initiatedBy (BUKAN cuma tenantId, beda dari usage-counter-scan
        // 1.5 yang genuinely tanpa aktor manusia) — supaya SET LOCAL
        // app.current_user_id terisi utk audit trigger (data_import_jobs
        // diaudit, lihat migration attach_audit_trigger) DAN supaya
        // mapper.importRow() (mis. UserService.inviteUser(), butuh
        // requireActorUserId()) berjalan benar di processCommit() (lihat di
        // bawah — sama-sama butuh pola ini).
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId, userId: job.initiatedBy }, async () => {
            const attachment = await this.prisma.withRls((tx) => tx.attachment.findFirst({ where: { entityType: data_import_constants_1.DATA_IMPORT_ENTITY_TYPE, entityId: job.id } }));
            if (!attachment) {
                throw new Error(`Attachment utk data_import_job ${job.id} tidak ditemukan — data tidak konsisten.`);
            }
            if (attachment.scanStatus === "PENDING_SCAN") {
                throw new Error("Menunggu hasil malware scan attachment — job akan di-retry otomatis.");
            }
            const claimed = await this.tryClaim(job.id, "UPLOADED", "VALIDATING");
            if (!claimed) {
                return; // kalah klaim — invocation lain sudah/sedang menangani job ini
            }
            if (attachment.scanStatus === "INFECTED") {
                await this.failJob(job.id, payload.tenantId, "File terdeteksi mengandung malware saat scan — import dibatalkan.");
                return;
            }
            const mapper = this.mapperRegistry.get(job.targetModuleCode);
            if (!mapper) {
                await this.failJob(job.id, payload.tenantId, `Modul "${job.targetModuleCode}" tidak lagi didukung untuk import data.`);
                return;
            }
            let totalRows = 0;
            let errorRows = 0;
            try {
                const buffer = await this.storage.getObjectBuffer(attachment.fileUrl);
                await this.forEachDataRow(buffer, async (rowNumber, rawRow) => {
                    totalRows++;
                    const result = mapper.validateRow(rawRow);
                    if (!result.valid) {
                        errorRows++;
                        await this.recordRowError(job.id, payload.tenantId, rowNumber, result.errorMessage, rawRow);
                    }
                });
            }
            catch (err) {
                this.logger.error(`processValidate: gagal parse file job ${job.id}: ${err instanceof Error ? err.message : String(err)}`);
                await this.failJob(job.id, payload.tenantId, `File tidak bisa diparse sebagai Excel yang valid: ${err instanceof Error ? err.message : String(err)}`);
                return;
            }
            if (totalRows === 0) {
                await this.failJob(job.id, payload.tenantId, "File tidak berisi baris data (sheet kosong atau cuma header).");
                return;
            }
            await this.transition(job.id, "VALIDATING", "VALIDATED", {
                totalRows,
                errorRows,
                successRows: totalRows - errorRows,
            });
        });
    }
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
    async processCommit(payload) {
        const job = await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, () => this.prisma.withRls((tx) => tx.dataImportJob.findUniqueOrThrow({ where: { id: payload.dataImportJobId } })));
        if (job.status !== "VALIDATED") {
            return; // idempotency guard — sudah IMPORTING/COMPLETED/COMPLETED_WITH_ERRORS/FAILED
        }
        // userId=job.initiatedBy — lihat banner comment sama di processValidate().
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId, userId: job.initiatedBy }, async () => {
            // Klaim atomik VALIDATED->IMPORTING — SATU-SATUNYA tempat transisi ini
            // terjadi (DataImportService.confirmImport() SENGAJA tidak lagi
            // menuliskannya sendiri, lihat banner comment di sana) supaya
            // "menang klaim" == "akulah satu-satunya yang menjalankan loop
            // import baris di bawah" — alasan sama persis processValidate().
            const claimed = await this.tryClaim(job.id, "VALIDATED", "IMPORTING");
            if (!claimed) {
                return;
            }
            const mapper = this.mapperRegistry.get(job.targetModuleCode);
            if (!mapper) {
                // Defensif — sudah dicek fase validate, seharusnya tidak tercapai.
                await this.failJob(job.id, payload.tenantId, `Modul "${job.targetModuleCode}" tidak lagi didukung untuk import data.`);
                return;
            }
            const priorErrors = await this.prisma.withRls((tx) => tx.dataImportError.findMany({ where: { dataImportJobId: job.id }, select: { rowNumber: true } }));
            const knownErrorRowNumbers = new Set(priorErrors.map((e) => e.rowNumber));
            const attachment = await this.prisma.withRls((tx) => tx.attachment.findFirstOrThrow({ where: { entityType: data_import_constants_1.DATA_IMPORT_ENTITY_TYPE, entityId: job.id } }));
            let successRows = 0;
            let errorRows = knownErrorRowNumbers.size;
            let processedSinceFlush = 0;
            const buffer = await this.storage.getObjectBuffer(attachment.fileUrl);
            await this.forEachDataRow(buffer, async (rowNumber, rawRow) => {
                if (knownErrorRowNumbers.has(rowNumber)) {
                    return;
                }
                try {
                    await mapper.importRow(rawRow);
                    successRows++;
                }
                catch (err) {
                    errorRows++;
                    await this.recordRowError(job.id, payload.tenantId, rowNumber, err instanceof Error ? err.message : String(err), rawRow);
                }
                processedSinceFlush++;
                if (processedSinceFlush >= data_import_constants_1.DATA_IMPORT_BATCH_SIZE) {
                    processedSinceFlush = 0;
                    await this.prisma.withRls((tx) => tx.dataImportJob.update({ where: { id: job.id }, data: { successRows, errorRows } }));
                }
            });
            const finalStatus = errorRows > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED";
            await this.transition(job.id, "IMPORTING", finalStatus, {
                successRows,
                errorRows,
                totalRows: job.totalRows ?? successRows + errorRows,
                completedAt: new Date(),
            });
        });
    }
    async transition(jobId, from, to, data) {
        (0, data_import_lifecycle_1.validateDataImportJobStatusTransition)(from, to);
        await this.prisma.withRls((tx) => tx.dataImportJob.update({ where: { id: jobId }, data: { ...data, status: to } }));
    }
    /**
     * Versi ATOMIK dari transition() — `updateMany({where:{id,status:from}})`
     * bukan `update({where:{id}})` biasa: Postgres MENJAMIN hanya SATU
     * invocation yang bisa menang mengubah baris dari status `from` yang
     * SAMA (row-level lock inheren pada UPDATE), TERLEPAS dari nilai
     * `job.status` in-memory yang mungkin sudah basi di sisi caller manapun
     * yang overlap. Lihat banner comment processValidate() utk alasan
     * lengkap kenapa ini dibutuhkan.
     */
    async tryClaim(jobId, from, to) {
        (0, data_import_lifecycle_1.validateDataImportJobStatusTransition)(from, to);
        const result = await this.prisma.withRls((tx) => tx.dataImportJob.updateMany({ where: { id: jobId, status: from }, data: { status: to } }));
        return result.count === 1;
    }
    async failJob(jobId, tenantId, message) {
        await this.recordRowError(jobId, tenantId, 0, message, {});
        const current = await this.prisma.withRls((tx) => tx.dataImportJob.findUniqueOrThrow({ where: { id: jobId } }));
        await this.transition(jobId, current.status, "FAILED", {
            totalRows: current.totalRows ?? 0,
            successRows: 0,
            errorRows: (current.errorRows ?? 0) + 1,
            completedAt: new Date(),
        });
    }
    async recordRowError(jobId, tenantId, rowNumber, errorMessage, rawRowData) {
        await this.prisma.withRls((tx) => tx.dataImportError.create({
            data: { tenantId, dataImportJobId: jobId, rowNumber, errorMessage, rawRowData: rawRowData },
        }));
    }
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
    async forEachDataRow(buffer, onRow) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const sheet = workbook.worksheets[0];
        if (!sheet) {
            throw new Error("File Excel tidak berisi sheet apa pun.");
        }
        let headerColumns = null;
        for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber++) {
            const row = sheet.getRow(rowNumber);
            const values = Array.isArray(row.values) ? row.values : [];
            if (rowNumber === 1) {
                headerColumns = values.slice(1).map(normalizeHeaderCell);
                continue;
            }
            if (!headerColumns) {
                continue; // safety net — row 1 selalu diproses duluan
            }
            const rawRow = {};
            headerColumns.forEach((columnName, index) => {
                rawRow[columnName] = values[index + 1];
            });
            await onRow(rowNumber, rawRow);
        }
    }
};
exports.DataImportProcessingService = DataImportProcessingService;
exports.DataImportProcessingService = DataImportProcessingService = DataImportProcessingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        object_storage_service_1.ObjectStorageService,
        data_import_row_mapper_registry_service_1.DataImportRowMapperRegistry])
], DataImportProcessingService);
function normalizeHeaderCell(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
}
