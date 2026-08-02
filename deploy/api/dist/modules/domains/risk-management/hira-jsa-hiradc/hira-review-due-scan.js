"use strict";
// Pure logic — mirror review-schedule-scan.ts (2.1) H-30 reminder pattern.
// PRD §8 baris 2 — "Mendekati review_due_date HIRA -> Pemilik HIRA ->
// 'HIRA {number} perlu ditinjau sebelum {review_due_date}'."
Object.defineProperty(exports, "__esModule", { value: true });
exports.findHiraAssessmentsDueForReviewReminder = findHiraAssessmentsDueForReviewReminder;
const HIRA_REVIEW_REMINDER_LEAD_DAYS = 30;
function daysBetween(a, b) {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    return Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY);
}
/** Hanya HIRA berstatus ACTIVE yang relevan (DRAFT/IN_REVIEW/dst belum
 * "berlaku", ARCHIVED sudah tidak perlu ditinjau lagi). */
function findHiraAssessmentsDueForReviewReminder(candidates, now) {
    return candidates.filter((c) => {
        if (c.status !== "ACTIVE")
            return false;
        if (c.reviewDueDate === null)
            return false;
        if (c.reviewReminderSentAt !== null)
            return false;
        return daysBetween(c.reviewDueDate, now) <= HIRA_REVIEW_REMINDER_LEAD_DAYS;
    });
}
//# sourceMappingURL=hira-review-due-scan.js.map