"use strict";
// Pure logic — mirror obligation-due-scan.ts (2.2)/risk-register-review-scan.ts style.
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOverdueRiskTreatmentPlans = findOverdueRiskTreatmentPlans;
/**
 * PRD §8 baris 4 — "risk_treatment_plans overdue -> Responsible user,
 * atasan." Hanya PLANNED/IN_PROGRESS relevan (COMPLETED/VERIFIED_EFFECTIVE/
 * CANCELLED sudah tidak lagi "berjalan", tidak perlu diingatkan).
 */
function findOverdueRiskTreatmentPlans(candidates, now) {
    return candidates.filter((c) => {
        if (c.status !== "PLANNED" && c.status !== "IN_PROGRESS")
            return false;
        if (c.overdueNotifiedAt !== null)
            return false;
        return c.targetDate.getTime() < now.getTime();
    });
}
//# sourceMappingURL=risk-treatment-overdue-scan.js.map