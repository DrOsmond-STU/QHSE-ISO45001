export type HiraReviewScanStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "ACTIVE" | "REQUIRES_REVISION" | "ARCHIVED";
export interface HiraReviewDueCandidate {
    hiraId: string;
    reviewDueDate: Date | null;
    status: HiraReviewScanStatus;
    reviewReminderSentAt: Date | null;
}
/** Hanya HIRA berstatus ACTIVE yang relevan (DRAFT/IN_REVIEW/dst belum
 * "berlaku", ARCHIVED sudah tidak perlu ditinjau lagi). */
export declare function findHiraAssessmentsDueForReviewReminder(candidates: HiraReviewDueCandidate[], now: Date): HiraReviewDueCandidate[];
