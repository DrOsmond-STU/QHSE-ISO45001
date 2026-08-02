"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREQUALIFICATION_RENEWAL_WARNING_WINDOW_DAYS = exports.CONTRACTOR_DUE_SCAN_JOB_NAME = exports.CONTRACTOR_DUE_SCAN_QUEUE = exports.CONTRACTOR_DUE_SCAN_CRON = void 0;
exports.CONTRACTOR_DUE_SCAN_CRON = process.env.CONTRACTOR_DUE_SCAN_CRON ?? "15 7 * * *";
exports.CONTRACTOR_DUE_SCAN_QUEUE = "contractor-due-scan";
exports.CONTRACTOR_DUE_SCAN_JOB_NAME = "scan";
// PRD §8 baris 3 "valid_until mendekati H-60".
exports.PREQUALIFICATION_RENEWAL_WARNING_WINDOW_DAYS = 60;
//# sourceMappingURL=contractor-due-scan.constants.js.map