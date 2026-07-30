import { findOverdueRiskTreatmentPlans, RiskTreatmentOverdueCandidate } from "./risk-treatment-overdue-scan";

const NOW = new Date("2026-07-25T00:00:00.000Z");

function candidate(overrides: Partial<RiskTreatmentOverdueCandidate>): RiskTreatmentOverdueCandidate {
  return { riskTreatmentId: "rt-1", targetDate: NOW, status: "PLANNED", overdueNotifiedAt: null, ...overrides };
}

function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}

describe("findOverdueRiskTreatmentPlans (PRD §8)", () => {
  it.each(["PLANNED", "IN_PROGRESS"] as const)("includes %s plan past target_date", (status) => {
    const c = candidate({ status, targetDate: daysFromNow(-1) });
    expect(findOverdueRiskTreatmentPlans([c], NOW)).toEqual([c]);
  });

  it.each(["COMPLETED", "VERIFIED_EFFECTIVE", "CANCELLED"] as const)("excludes finished/cancelled plan %s", (status) => {
    const c = candidate({ status, targetDate: daysFromNow(-5) });
    expect(findOverdueRiskTreatmentPlans([c], NOW)).toEqual([]);
  });

  it("excludes plan not yet past target_date", () => {
    const c = candidate({ targetDate: daysFromNow(3) });
    expect(findOverdueRiskTreatmentPlans([c], NOW)).toEqual([]);
  });

  it("excludes plan already notified overdue", () => {
    const c = candidate({ targetDate: daysFromNow(-3), overdueNotifiedAt: daysFromNow(-1) });
    expect(findOverdueRiskTreatmentPlans([c], NOW)).toEqual([]);
  });
});
