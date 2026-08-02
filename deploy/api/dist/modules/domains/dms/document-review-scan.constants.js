"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCUMENT_REVIEW_SCAN_CRON = exports.DOCUMENT_REVIEW_SCAN_JOB_NAME = exports.DOCUMENT_REVIEW_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik — PRD §4.3 "H-30 sebelum
// scheduled_review_date" + BR-06 "melewati scheduled_review_date -> OVERDUE".
// Cron 01:15 — setelah reminder-scan (00:30)/delegation-scan (00:45)/
// usage-counter-scan (01:00), belum ada job lain di slot ini.
exports.DOCUMENT_REVIEW_SCAN_QUEUE = "document-review-scan";
exports.DOCUMENT_REVIEW_SCAN_JOB_NAME = "scan";
exports.DOCUMENT_REVIEW_SCAN_CRON = process.env.DOCUMENT_REVIEW_SCAN_CRON ?? "15 1 * * *";
//# sourceMappingURL=document-review-scan.constants.js.map