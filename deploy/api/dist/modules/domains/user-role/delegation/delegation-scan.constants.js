"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELEGATION_SCAN_CRON = exports.DELEGATION_SCAN_JOB_NAME = exports.DELEGATION_SCAN_QUEUE = void 0;
// TDD §13.1 — job cron harian, pola sama reminder-scan (1.1). Job BARU
// (bukan diperluas dari reminder-scan yang generik BR-06 Modul 01) karena
// scope-nya beda modul (Modul 02) dan sudah punya efek samping sendiri yang
// nontrivial (BR-08: provisioning/deaktivasi workflow_delegations + reroute
// workflow_tasks) — bukan sekadar "cek tanggal lain lalu update status".
exports.DELEGATION_SCAN_QUEUE = "delegation-scan";
exports.DELEGATION_SCAN_JOB_NAME = "scan";
// 00:45 tiap hari — setelah reminder-scan (00:30) supaya tidak tabrakan
// jendela I/O dgn job dini-hari lain. Env-override HANYA utk uji manual.
exports.DELEGATION_SCAN_CRON = process.env.DELEGATION_SCAN_CRON ?? "45 0 * * *";
//# sourceMappingURL=delegation-scan.constants.js.map