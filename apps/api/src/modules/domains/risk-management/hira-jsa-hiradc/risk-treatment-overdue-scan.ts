// Pure logic — mirror obligation-due-scan.ts (2.2)/risk-register-review-scan.ts style.

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
export function findOverdueRiskTreatmentPlans(candidates: RiskTreatmentOverdueCandidate[], now: Date): RiskTreatmentOverdueCandidate[] {
  return candidates.filter((c) => {
    if (c.status !== "PLANNED" && c.status !== "IN_PROGRESS") return false;
    if (c.overdueNotifiedAt !== null) return false;
    return c.targetDate.getTime() < now.getTime();
  });
}
