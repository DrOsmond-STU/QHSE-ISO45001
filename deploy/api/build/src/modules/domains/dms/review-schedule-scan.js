"use strict";
// Pure logic — mirror workflow-sla-scan.ts (0.9)/reminder-scan (1.1)
// pattern: caller (DocumentReviewScanService) baca kandidat dari DB, panggil
// fungsi ini, lalu caller yang tulis hasilnya. Tidak ada Prisma/BullMQ di
// sini sama sekali.
Object.defineProperty(exports, "__esModule", { value: true });
exports.findReviewsDueForReminder = findReviewsDueForReminder;
exports.findOverdueReviewSchedules = findOverdueReviewSchedules;
const REVIEW_REMINDER_LEAD_DAYS = 30;
function daysBetween(a, b) {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    return Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY);
}
/**
 * PRD §4.3 poin 2 — "H-30 sebelum scheduled_review_date, notifikasi ke
 * Document Owner". Jendela `<=30` (BUKAN `===30`) — job harian yang absen
 * TEPAT di hari H-30 tetap "mengejar" di hari berikutnya, pola sama
 * findOverdueTasks() (0.9) yang juga pakai perbandingan arah, bukan
 * equality. reviewReminderSentAt bukan NULL = SUDAH pernah dikirim,
 * PERMANEN dikecualikan berapa kali pun job berikutnya jalan/retry
 * (idempotency natural-key, TDD §13.2). Jadwal yang review-nya SUDAH
 * selesai (actualReviewDate terisi) tidak pernah butuh reminder lagi.
 */
function findReviewsDueForReminder(candidates, now) {
    return candidates.filter((c) => {
        if (c.actualReviewDate !== null)
            return false;
        if (c.reviewReminderSentAt !== null)
            return false;
        return daysBetween(c.scheduledReviewDate, now) <= REVIEW_REMINDER_LEAD_DAYS;
    });
}
/**
 * BR-06 (PRD §6) — "document_review_schedule yang melewati
 * scheduled_review_date tanpa actual_review_date terisi otomatis berstatus
 * OVERDUE (job terjadwal) dan memicu eskalasi." Status SCHEDULED/IN_PROGRESS
 * saja yang relevan (COMPLETED/CANCELLED/OVERDUE sendiri tidak perlu
 * dievaluasi ulang) — filter status dilakukan di query kandidat caller,
 * bukan di sini (pola sama findOverdueTasks() yang juga menerima kandidat
 * yang SUDAH difilter status PENDING dari query-nya).
 */
function findOverdueReviewSchedules(candidates, now) {
    return candidates.filter((c) => {
        if (c.actualReviewDate !== null)
            return false;
        return daysBetween(now, c.scheduledReviewDate) > 0;
    });
}
