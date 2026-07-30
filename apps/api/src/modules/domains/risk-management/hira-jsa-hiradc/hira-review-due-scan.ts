// Pure logic — mirror review-schedule-scan.ts (2.1) H-30 reminder pattern.
// PRD §8 baris 2 — "Mendekati review_due_date HIRA -> Pemilik HIRA ->
// 'HIRA {number} perlu ditinjau sebelum {review_due_date}'."

const HIRA_REVIEW_REMINDER_LEAD_DAYS = 30;

export type HiraReviewScanStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "ACTIVE" | "REQUIRES_REVISION" | "ARCHIVED";

export interface HiraReviewDueCandidate {
  hiraId: string;
  reviewDueDate: Date | null;
  status: HiraReviewScanStatus;
  reviewReminderSentAt: Date | null;
}

function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY);
}

/** Hanya HIRA berstatus ACTIVE yang relevan (DRAFT/IN_REVIEW/dst belum
 * "berlaku", ARCHIVED sudah tidak perlu ditinjau lagi). */
export function findHiraAssessmentsDueForReviewReminder(candidates: HiraReviewDueCandidate[], now: Date): HiraReviewDueCandidate[] {
  return candidates.filter((c) => {
    if (c.status !== "ACTIVE") return false;
    if (c.reviewDueDate === null) return false;
    if (c.reviewReminderSentAt !== null) return false;
    return daysBetween(c.reviewDueDate, now) <= HIRA_REVIEW_REMINDER_LEAD_DAYS;
  });
}
