"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUDITOR_COMPETENCY_EXPIRY_SCAN_CRON = exports.AUDITOR_COMPETENCY_EXPIRY_SCAN_JOB_NAME = exports.AUDITOR_COMPETENCY_EXPIRY_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik. Cron 05:15 — slot berikutnya setelah
// Emergency Response (05:00).
exports.AUDITOR_COMPETENCY_EXPIRY_SCAN_QUEUE = "auditor-competency-expiry-scan";
exports.AUDITOR_COMPETENCY_EXPIRY_SCAN_JOB_NAME = "scan";
exports.AUDITOR_COMPETENCY_EXPIRY_SCAN_CRON = process.env.AUDITOR_COMPETENCY_EXPIRY_SCAN_CRON ?? "15 5 * * *";
