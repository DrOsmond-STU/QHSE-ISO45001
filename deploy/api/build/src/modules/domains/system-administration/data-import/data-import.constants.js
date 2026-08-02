"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATA_IMPORT_BATCH_SIZE = exports.DATA_IMPORT_COMMIT_MAX_ATTEMPTS = exports.DATA_IMPORT_VALIDATE_MAX_ATTEMPTS = exports.DATA_IMPORT_COMMIT_JOB_NAME = exports.DATA_IMPORT_VALIDATE_JOB_NAME = exports.DATA_IMPORT_QUEUE = exports.DATA_IMPORT_ALLOWED_MIME_TYPES = exports.DATA_IMPORT_ENTITY_TYPE = void 0;
// entityType dipakai saat presign()/confirm() attachment (0.12) utk file
// Excel import — lihat banner comment schema.prisma "Task 1.6" utk alasan
// lengkap kenapa job id sendiri (bukan kolom attachment_id terpisah) yang
// jadi penghubungnya.
exports.DATA_IMPORT_ENTITY_TYPE = "DATA_IMPORT_JOB";
exports.DATA_IMPORT_ALLOWED_MIME_TYPES = [
    "application/vnd.ms-excel", // .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
];
// TDD §13.1 pola nama queue — SATU queue "data-import", DUA job name
// (validate/commit) krn keduanya operasi pada entitas yang sama
// (data_import_jobs) dgn payload identik ({tenantId, dataImportJobId}),
// beda dari attachment-scan/usage-counter-scan yang masing2 1 queue/1 job
// name. Attempts TINGGI utk job "validate" SENGAJA (beda dari job "commit")
// — dipakai jadi mekanisme tunggu-hasil-scan-malware via retry/backoff
// BullMQ, bukan menambah infra polling terpisah (lihat
// DataImportProcessingService.processValidate()).
exports.DATA_IMPORT_QUEUE = "data-import";
exports.DATA_IMPORT_VALIDATE_JOB_NAME = "validate";
exports.DATA_IMPORT_COMMIT_JOB_NAME = "commit";
exports.DATA_IMPORT_VALIDATE_MAX_ATTEMPTS = 10;
exports.DATA_IMPORT_COMMIT_MAX_ATTEMPTS = 3;
// TDD §20 — "batch transaksi kecil (mis. 500 baris per transaksi)". Batas
// ini dipakai di level LOOP APLIKASI (progress tracking/chunking), bukan
// literal 1 transaksi Postgres per 500 baris — lihat banner comment
// DataImportRowMapper.importRow() utk alasan lengkap deviasinya.
exports.DATA_IMPORT_BATCH_SIZE = 500;
