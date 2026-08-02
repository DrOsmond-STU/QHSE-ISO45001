export type RiskTreatmentScanStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "VERIFIED_EFFECTIVE" | "CANCELLED";
export interface RiskTreatmentOverdueCandidate {
    riskTreatmentId: string;
    targetDate: Date;
    status: RiskTreatmentScanStatus;
    overdueNotifiedAt: Date | null;
}
/**
 * PRD §8 baris 4 — "risk_treatment_plans overdue -> Responsible user,
 * atasan." Hanya PLANNED/IN_PROGRESS relevan (COMPLETED/VERIFIED_EFFECTIVE/
 * CANCELLED sudah tidak lagi "berjalan", tidak perlu diingatkan).
 */
export declare function findOverdueRiskTreatmentPlans(candidates: RiskTreatmentOverdueCandidate[], now: Date): RiskTreatmentOverdueCandidate[];
