// TDD §13.1 pola job cron generik — PRD §4.3 poin 1 (BR-01/02 + notifikasi
// bertingkat H-90/H-30/H-7). Cron 01:45 — setelah document-review-scan
// (01:15)/read-acknowledgement-scan (01:30, 2.1), belum ada job lain di
// slot ini.
export const LICENSE_EXPIRY_SCAN_QUEUE = "license-expiry-scan";
export const LICENSE_EXPIRY_SCAN_JOB_NAME = "scan";
export const LICENSE_EXPIRY_SCAN_CRON = process.env.LICENSE_EXPIRY_SCAN_CRON ?? "45 1 * * *";
