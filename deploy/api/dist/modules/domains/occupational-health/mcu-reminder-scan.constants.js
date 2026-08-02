"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCU_REMINDER_SCAN_CRON = exports.MCU_REMINDER_SCAN_JOB_NAME = exports.MCU_REMINDER_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik. Cron 06:45 — slot berikutnya setelah
// waste-storage-duration-scan (06:30, 5.2).
exports.MCU_REMINDER_SCAN_QUEUE = "mcu-reminder-scan";
exports.MCU_REMINDER_SCAN_JOB_NAME = "scan";
exports.MCU_REMINDER_SCAN_CRON = process.env.MCU_REMINDER_SCAN_CRON ?? "45 6 * * *";
//# sourceMappingURL=mcu-reminder-scan.constants.js.map