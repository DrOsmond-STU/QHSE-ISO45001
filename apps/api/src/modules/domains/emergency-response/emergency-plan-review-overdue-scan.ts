import { isPlanReviewOverdueBy30Days } from "./emergency-response-plan-lifecycle";

// BR-01 bagian scan — kandidat "flag dashboard" + "notifikasi eskalasi ke
// HSE Manager" begitu next_review_due_date terlewati > 30 hari. Caller
// menyaring status=APPROVED_ACTIVE (rencana DRAFT/UNDER_REVIEW belum
// genuinely "berlaku", jadi jatuh tempo reviewnya belum relevan) SEBELUM
// memanggil fungsi ini.
export interface PlanReviewOverdueCandidate {
  planId: string;
  nextReviewDueDate: Date | null;
}

export function findPlansWithOverdueReview(candidates: PlanReviewOverdueCandidate[], now: Date): PlanReviewOverdueCandidate[] {
  return candidates.filter((c) => isPlanReviewOverdueBy30Days(c.nextReviewDueDate, now));
}
