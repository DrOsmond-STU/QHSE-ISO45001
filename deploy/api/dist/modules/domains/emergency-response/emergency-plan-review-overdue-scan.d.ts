export interface PlanReviewOverdueCandidate {
    planId: string;
    nextReviewDueDate: Date | null;
}
export declare function findPlansWithOverdueReview(candidates: PlanReviewOverdueCandidate[], now: Date): PlanReviewOverdueCandidate[];
