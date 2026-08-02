"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const risk_treatment_overdue_scan_1 = require("./risk-treatment-overdue-scan");
const NOW = new Date("2026-07-25T00:00:00.000Z");
function candidate(overrides) {
    return { riskTreatmentId: "rt-1", targetDate: NOW, status: "PLANNED", overdueNotifiedAt: null, ...overrides };
}
function daysFromNow(days) {
    return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}
describe("findOverdueRiskTreatmentPlans (PRD §8)", () => {
    it.each(["PLANNED", "IN_PROGRESS"])("includes %s plan past target_date", (status) => {
        const c = candidate({ status, targetDate: daysFromNow(-1) });
        expect((0, risk_treatment_overdue_scan_1.findOverdueRiskTreatmentPlans)([c], NOW)).toEqual([c]);
    });
    it.each(["COMPLETED", "VERIFIED_EFFECTIVE", "CANCELLED"])("excludes finished/cancelled plan %s", (status) => {
        const c = candidate({ status, targetDate: daysFromNow(-5) });
        expect((0, risk_treatment_overdue_scan_1.findOverdueRiskTreatmentPlans)([c], NOW)).toEqual([]);
    });
    it("excludes plan not yet past target_date", () => {
        const c = candidate({ targetDate: daysFromNow(3) });
        expect((0, risk_treatment_overdue_scan_1.findOverdueRiskTreatmentPlans)([c], NOW)).toEqual([]);
    });
    it("excludes plan already notified overdue", () => {
        const c = candidate({ targetDate: daysFromNow(-3), overdueNotifiedAt: daysFromNow(-1) });
        expect((0, risk_treatment_overdue_scan_1.findOverdueRiskTreatmentPlans)([c], NOW)).toEqual([]);
    });
});
//# sourceMappingURL=risk-treatment-overdue-scan.spec.js.map