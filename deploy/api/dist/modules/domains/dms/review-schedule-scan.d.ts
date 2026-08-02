export interface ReviewScheduleCandidate {
    reviewScheduleId: string;
    scheduledReviewDate: Date;
    actualReviewDate: Date | null;
    reviewReminderSentAt: Date | null;
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
export declare function findReviewsDueForReminder(candidates: ReviewScheduleCandidate[], now: Date): ReviewScheduleCandidate[];
/**
 * BR-06 (PRD §6) — "document_review_schedule yang melewati
 * scheduled_review_date tanpa actual_review_date terisi otomatis berstatus
 * OVERDUE (job terjadwal) dan memicu eskalasi." Status SCHEDULED/IN_PROGRESS
 * saja yang relevan (COMPLETED/CANCELLED/OVERDUE sendiri tidak perlu
 * dievaluasi ulang) — filter status dilakukan di query kandidat caller,
 * bukan di sini (pola sama findOverdueTasks() yang juga menerima kandidat
 * yang SUDAH difilter status PENDING dari query-nya).
 */
export declare function findOverdueReviewSchedules(candidates: ReviewScheduleCandidate[], now: Date): ReviewScheduleCandidate[];
