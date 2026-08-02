"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USAGE_COUNTER_SCAN_CRON = exports.USAGE_COUNTER_SCAN_JOB_NAME = exports.USAGE_COUNTER_SCAN_QUEUE = void 0;
// TDD §13.1 — job cron harian, pola sama reminder-scan (1.1)/
// delegation-scan (1.4). BR-02 Modul 31 §6: snapshot pemakaian aktual vs
// kuota plan, "measured_at | Snapshot berkala (job harian)" literal PRD.
exports.USAGE_COUNTER_SCAN_QUEUE = "usage-counter-scan";
exports.USAGE_COUNTER_SCAN_JOB_NAME = "scan";
// 01:00 tiap hari — setelah delegation-scan (00:45), reminder-scan (00:30),
// audit-log-partition-maintenance (00:10 tanggal 1) — jaga urutan jendela
// I/O dini-hari tidak tabrakan. Env-override HANYA utk uji manual.
exports.USAGE_COUNTER_SCAN_CRON = process.env.USAGE_COUNTER_SCAN_CRON ?? "0 1 * * *";
//# sourceMappingURL=usage-counter-scan.constants.js.map