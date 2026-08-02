"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RISK_REGISTER_REVIEW_SCAN_CRON = exports.RISK_REGISTER_REVIEW_SCAN_JOB_NAME = exports.RISK_REGISTER_REVIEW_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik — BR-05 (PRD Modul 05 §6). Cron 02:30.
exports.RISK_REGISTER_REVIEW_SCAN_QUEUE = "risk-register-review-scan";
exports.RISK_REGISTER_REVIEW_SCAN_JOB_NAME = "scan";
exports.RISK_REGISTER_REVIEW_SCAN_CRON = process.env.RISK_REGISTER_REVIEW_SCAN_CRON ?? "30 2 * * *";
