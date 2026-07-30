// TDD §13.1 pola job cron generik — BR-04 "melewati acknowledgement_due_days
// tanpa acknowledge -> OVERDUE, eskalasi notifikasi ke user & atasannya".
// Cron 01:30 — setelah document-review-scan (01:15), belum ada job lain di
// slot ini.
export const READ_ACKNOWLEDGEMENT_SCAN_QUEUE = "read-acknowledgement-scan";
export const READ_ACKNOWLEDGEMENT_SCAN_JOB_NAME = "scan";
export const READ_ACKNOWLEDGEMENT_SCAN_CRON = process.env.READ_ACKNOWLEDGEMENT_SCAN_CRON ?? "30 1 * * *";
