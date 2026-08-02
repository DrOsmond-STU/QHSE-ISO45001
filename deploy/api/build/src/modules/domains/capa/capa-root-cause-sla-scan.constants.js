"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAPA_ROOT_CAUSE_SLA_SCAN_CRON = exports.CAPA_ROOT_CAUSE_SLA_SCAN_JOB_NAME = exports.CAPA_ROOT_CAUSE_SLA_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik. Cron 05:45 — slot berikutnya setelah
// audit-finding-closure-due-scan (05:30, 4.1).
exports.CAPA_ROOT_CAUSE_SLA_SCAN_QUEUE = "capa-root-cause-sla-scan";
exports.CAPA_ROOT_CAUSE_SLA_SCAN_JOB_NAME = "scan";
exports.CAPA_ROOT_CAUSE_SLA_SCAN_CRON = process.env.CAPA_ROOT_CAUSE_SLA_SCAN_CRON ?? "45 5 * * *";
