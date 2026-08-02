"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.READ_ACKNOWLEDGEMENT_SCAN_CRON = exports.READ_ACKNOWLEDGEMENT_SCAN_JOB_NAME = exports.READ_ACKNOWLEDGEMENT_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik — BR-04 "melewati acknowledgement_due_days
// tanpa acknowledge -> OVERDUE, eskalasi notifikasi ke user & atasannya".
// Cron 01:30 — setelah document-review-scan (01:15), belum ada job lain di
// slot ini.
exports.READ_ACKNOWLEDGEMENT_SCAN_QUEUE = "read-acknowledgement-scan";
exports.READ_ACKNOWLEDGEMENT_SCAN_JOB_NAME = "scan";
exports.READ_ACKNOWLEDGEMENT_SCAN_CRON = process.env.READ_ACKNOWLEDGEMENT_SCAN_CRON ?? "30 1 * * *";
//# sourceMappingURL=read-acknowledgement-scan.constants.js.map