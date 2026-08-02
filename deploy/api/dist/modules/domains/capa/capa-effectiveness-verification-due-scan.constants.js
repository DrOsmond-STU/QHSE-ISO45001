"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_CRON = exports.CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_JOB_NAME = exports.CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik. Cron 06:00 — slot berikutnya setelah
// capa-root-cause-sla-scan (05:45).
exports.CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_QUEUE = "capa-effectiveness-verification-due-scan";
exports.CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_JOB_NAME = "scan";
exports.CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_CRON = process.env.CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_CRON ?? "0 6 * * *";
//# sourceMappingURL=capa-effectiveness-verification-due-scan.constants.js.map