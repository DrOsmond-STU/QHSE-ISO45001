import { findOverdueRiskRegisterReviews, RiskRegisterReviewCandidate } from "./risk-register-review-scan";

const NOW = new Date("2026-07-25T00:00:00.000Z");

function candidate(overrides: Partial<RiskRegisterReviewCandidate>): RiskRegisterReviewCandidate {
  return { riskRegisterId: "risk-1", nextReviewDate: null, status: "MONITORED", overdueNotifiedAt: null, ...overrides };
}

function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}

describe("findOverdueRiskRegisterReviews (BR-05)", () => {
  it("includes a risk whose next_review_date has passed", () => {
    const c = candidate({ nextReviewDate: daysFromNow(-1) });
    expect(findOverdueRiskRegisterReviews([c], NOW)).toEqual([c]);
  });

  it("excludes a risk not yet due for review", () => {
    const c = candidate({ nextReviewDate: daysFromNow(5) });
    expect(findOverdueRiskRegisterReviews([c], NOW)).toEqual([]);
  });

  it("excludes a CLOSED risk even if overdue", () => {
    const c = candidate({ status: "CLOSED", nextReviewDate: daysFromNow(-10) });
    expect(findOverdueRiskRegisterReviews([c], NOW)).toEqual([]);
  });

  it("excludes a risk already notified overdue (idempotent)", () => {
    const c = candidate({ nextReviewDate: daysFromNow(-10), overdueNotifiedAt: daysFromNow(-2) });
    expect(findOverdueRiskRegisterReviews([c], NOW)).toEqual([]);
  });

  it("excludes a risk with null next_review_date", () => {
    const c = candidate({ nextReviewDate: null });
    expect(findOverdueRiskRegisterReviews([c], NOW)).toEqual([]);
  });

  it.each(["IDENTIFIED", "ASSESSED", "TREATMENT_IN_PROGRESS", "MONITORED"] as const)(
    "catches overdue regardless of active status %s",
    (status) => {
      const c = candidate({ status, nextReviewDate: daysFromNow(-3) });
      expect(findOverdueRiskRegisterReviews([c], NOW)).toEqual([c]);
    },
  );
});
