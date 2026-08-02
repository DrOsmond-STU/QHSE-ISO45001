"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REMINDER_SCAN_CRON = exports.REMINDER_SCAN_JOB_NAME = exports.REMINDER_SCAN_QUEUE = void 0;
// TDD §13.1 — "reminder-scan | Cron harian | Kalibrasi jatuh tempo, permit
// expiry, training expiry, subscription end_date". Job GENERIK dipakai
// BERSAMA lintas modul (belum ada satu pun modul lain di atas selain
// organization saat ini) — task 1.1 adalah KONSUMEN PERTAMA (BR-06: site
// PROJECT lewat end_date -> auto INACTIVE). Modul Phase 2+ (kalibrasi,
// permit, training, subscription) menambah CEK-nya SENDIRI ke
// ReminderScanService.scan() yang SAMA, bukan job baru per modul.
exports.REMINDER_SCAN_QUEUE = "reminder-scan";
exports.REMINDER_SCAN_JOB_NAME = "scan";
// 00:30 tiap hari — setelah audit-log-partition-maintenance (00:10 tanggal
// 1) supaya tidak tabrakan jendela I/O dgn job dini-hari lain yang mungkin
// ada. Env-override HANYA utk uji manual (pola sama job lain).
exports.REMINDER_SCAN_CRON = process.env.REMINDER_SCAN_CRON ?? "30 0 * * *";
