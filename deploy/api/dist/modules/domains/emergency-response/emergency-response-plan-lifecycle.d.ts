import { EmergencyPlanReviewFrequency, EmergencyPlanStatus } from "@prisma/client";
export declare function validateEmergencyResponsePlanStatusTransition(from: EmergencyPlanStatus, to: EmergencyPlanStatus): void;
export declare function isPlanReviewOverdueBy30Days(nextReviewDueDate: Date | null, now: Date): boolean;
export declare function computeNextReviewDueDate(fromDate: Date, frequency: EmergencyPlanReviewFrequency): Date;
