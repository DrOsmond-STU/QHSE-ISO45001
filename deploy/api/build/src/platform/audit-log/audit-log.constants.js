"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUDIT_LOG_TRIGGER_FUNCTION_NAME = exports.AUDIT_LOG_TABLE_NAME = exports.AUDIT_LOG_PARTITION_MAINTENANCE_CRON = exports.AUDIT_LOG_PARTITION_MAINTENANCE_JOB_NAME = exports.AUDIT_LOG_PARTITION_MAINTENANCE_QUEUE = void 0;
// TDD §13.1 — nama queue persis "audit-log-partition-maintenance".
exports.AUDIT_LOG_PARTITION_MAINTENANCE_QUEUE = "audit-log-partition-maintenance";
exports.AUDIT_LOG_PARTITION_MAINTENANCE_JOB_NAME = "ensure-partitions";
// TDD §13.1 — "Cron bulanan". Cron pattern (bukan `every` interval seperti
// workflow-sla-scan 0.9) supaya jadwalnya align ke tanggal kalender, bukan
// mendekati "sebulan" lewat interval milidetik yang lama-lama drift. Default
// produksi: jam 00:10 tanggal 1 tiap bulan (10 menit setelah tengah malam —
// hindari tabrakan dgn job tengah-malam lain yang mungkin ada). Env-override
// HANYA untuk uji manual, pola sama WORKFLOW_SLA_SCAN_INTERVAL_MS 0.9.
exports.AUDIT_LOG_PARTITION_MAINTENANCE_CRON = process.env.AUDIT_LOG_PARTITION_MAINTENANCE_CRON ?? "10 0 1 * *";
// Nama trigger + fungsi generik (prisma/migrations/*_init_audit_log_tables) —
// dirujuk audit-log-trigger.template.sql & job partition-maintenance (job
// mengulang CREATE TRIGGER yang SAMA di partisi baru bukan di tabel baru,
// jadi konstanta ini dipakai penamaan konsisten, bukan trigger baru).
exports.AUDIT_LOG_TABLE_NAME = "system_audit_logs";
exports.AUDIT_LOG_TRIGGER_FUNCTION_NAME = "audit_log_capture";
