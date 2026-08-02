"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORK_PERMIT_EXPIRY_SCAN_CRON = exports.WORK_PERMIT_EXPIRY_SCAN_JOB_NAME = exports.WORK_PERMIT_EXPIRY_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik — BR-07 (PRD Modul 06 §6), E2E-1
// acceptance criterion. Cron 03:00 — slot berikutnya setelah risk-management
// (3.2, 02:15/02:30/02:45).
exports.WORK_PERMIT_EXPIRY_SCAN_QUEUE = "work-permit-expiry-scan";
exports.WORK_PERMIT_EXPIRY_SCAN_JOB_NAME = "scan";
exports.WORK_PERMIT_EXPIRY_SCAN_CRON = process.env.WORK_PERMIT_EXPIRY_SCAN_CRON ?? "0 3 * * *";
