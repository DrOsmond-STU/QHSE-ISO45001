import {
  computeNextReviewDueDate,
  isPlanReviewOverdueBy30Days,
  validateEmergencyResponsePlanStatusTransition,
} from "./emergency-response-plan-lifecycle";

describe("validateEmergencyResponsePlanStatusTransition", () => {
  it("mengizinkan DRAFT->UNDER_REVIEW", () => {
    expect(() => validateEmergencyResponsePlanStatusTransition("DRAFT", "UNDER_REVIEW")).not.toThrow();
  });

  it("mengizinkan UNDER_REVIEW->APPROVED_ACTIVE", () => {
    expect(() => validateEmergencyResponsePlanStatusTransition("UNDER_REVIEW", "APPROVED_ACTIVE")).not.toThrow();
  });

  it("mengizinkan UNDER_REVIEW->DRAFT (jalur REJECTED, enum tidak py nilai REJECTED)", () => {
    expect(() => validateEmergencyResponsePlanStatusTransition("UNDER_REVIEW", "DRAFT")).not.toThrow();
  });

  it("mengizinkan APPROVED_ACTIVE->SUPERSEDED dan ->ARCHIVED", () => {
    expect(() => validateEmergencyResponsePlanStatusTransition("APPROVED_ACTIVE", "SUPERSEDED")).not.toThrow();
    expect(() => validateEmergencyResponsePlanStatusTransition("APPROVED_ACTIVE", "ARCHIVED")).not.toThrow();
  });

  it("menolak DRAFT->APPROVED_ACTIVE langsung (lompat review)", () => {
    expect(() => validateEmergencyResponsePlanStatusTransition("DRAFT", "APPROVED_ACTIVE")).toThrow(/tidak valid/);
  });

  it("menolak transisi dari status terminal SUPERSEDED/ARCHIVED", () => {
    expect(() => validateEmergencyResponsePlanStatusTransition("SUPERSEDED", "DRAFT")).toThrow();
    expect(() => validateEmergencyResponsePlanStatusTransition("ARCHIVED", "UNDER_REVIEW")).toThrow();
  });
});

describe("isPlanReviewOverdueBy30Days (BR-01)", () => {
  const now = new Date("2026-07-26T00:00:00.000Z");

  it("false kalau nextReviewDueDate null", () => {
    expect(isPlanReviewOverdueBy30Days(null, now)).toBe(false);
  });

  it("false kalau baru terlewat 10 hari (belum >30 hari)", () => {
    const due = new Date("2026-07-16T00:00:00.000Z");
    expect(isPlanReviewOverdueBy30Days(due, now)).toBe(false);
  });

  it("false tepat di batas 30 hari (harus STRICTLY lebih dari 30)", () => {
    const due = new Date("2026-06-26T00:00:00.000Z"); // tepat 30 hari
    expect(isPlanReviewOverdueBy30Days(due, now)).toBe(false);
  });

  it("true kalau terlewat 31 hari", () => {
    const due = new Date("2026-06-25T00:00:00.000Z");
    expect(isPlanReviewOverdueBy30Days(due, now)).toBe(true);
  });

  it("false kalau nextReviewDueDate di masa depan", () => {
    const due = new Date("2026-08-26T00:00:00.000Z");
    expect(isPlanReviewOverdueBy30Days(due, now)).toBe(false);
  });
});

describe("computeNextReviewDueDate", () => {
  it("ANNUAL -> +1 tahun", () => {
    const result = computeNextReviewDueDate(new Date("2026-07-26T00:00:00.000Z"), "ANNUAL");
    expect(result.toISOString()).toBe("2027-07-26T00:00:00.000Z");
  });

  it("BIENNIAL -> +2 tahun", () => {
    const result = computeNextReviewDueDate(new Date("2026-07-26T00:00:00.000Z"), "BIENNIAL");
    expect(result.toISOString()).toBe("2028-07-26T00:00:00.000Z");
  });
});
