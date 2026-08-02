"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HIRA_REVIEW_DUE_SCAN_CRON = exports.HIRA_REVIEW_DUE_SCAN_JOB_NAME = exports.HIRA_REVIEW_DUE_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik — PRD §8 baris 2 (HIRA review_due_date
// H-30). Cron 02:45.
exports.HIRA_REVIEW_DUE_SCAN_QUEUE = "hira-review-due-scan";
exports.HIRA_REVIEW_DUE_SCAN_JOB_NAME = "scan";
exports.HIRA_REVIEW_DUE_SCAN_CRON = process.env.HIRA_REVIEW_DUE_SCAN_CRON ?? "45 2 * * *";
