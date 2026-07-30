import {
  assertCanCloseEvaluation,
  computeNextObligationDueDate,
  validateComplianceEvaluationStatusTransition,
} from "./compliance-evaluation-lifecycle";

describe("validateComplianceEvaluationStatusTransition", () => {
  it.each([
    ["DRAFT", "SUBMITTED"],
    ["SUBMITTED", "REVIEWED"],
    ["SUBMITTED", "DRAFT"],
    ["REVIEWED", "CLOSED"],
  ] as const)("allows %s -> %s", (from, to) => {
    expect(() => validateComplianceEvaluationStatusTransition(from, to)).not.toThrow();
  });

  it.each([
    ["DRAFT", "REVIEWED"],
    ["DRAFT", "CLOSED"],
    ["SUBMITTED", "CLOSED"],
    ["REVIEWED", "DRAFT"],
    ["REVIEWED", "SUBMITTED"],
    ["CLOSED", "DRAFT"],
    ["CLOSED", "REVIEWED"],
  ] as const)("rejects %s -> %s", (from, to) => {
    expect(() => validateComplianceEvaluationStatusTransition(from, to)).toThrow();
  });
});

describe("assertCanCloseEvaluation (BR-03)", () => {
  it.each(["NON_COMPLIANT", "PARTIALLY_COMPLIANT"] as const)(
    "throws when compliance_status=%s and linked_capa_id is null",
    (status) => {
      expect(() => assertCanCloseEvaluation(status, null)).toThrow(/BR-03/);
    },
  );

  it.each(["NON_COMPLIANT", "PARTIALLY_COMPLIANT"] as const)(
    "allows when compliance_status=%s and linked_capa_id is filled",
    (status) => {
      expect(() => assertCanCloseEvaluation(status, "11111111-1111-1111-1111-111111111111")).not.toThrow();
    },
  );

  it.each(["COMPLIANT", "NOT_APPLICABLE"] as const)("allows %s without linked_capa_id", (status) => {
    expect(() => assertCanCloseEvaluation(status, null)).not.toThrow();
  });
});

describe("computeNextObligationDueDate (BR-06)", () => {
  const CLOSED_AT = new Date(Date.UTC(2026, 6, 25));

  it("adds 1 month for MONTHLY", () => {
    expect(computeNextObligationDueDate(CLOSED_AT, "MONTHLY")).toEqual(new Date(Date.UTC(2026, 7, 25)));
  });

  it("adds 3 months for QUARTERLY", () => {
    expect(computeNextObligationDueDate(CLOSED_AT, "QUARTERLY")).toEqual(new Date(Date.UTC(2026, 9, 25)));
  });

  it("adds 6 months for SEMI_ANNUAL", () => {
    expect(computeNextObligationDueDate(CLOSED_AT, "SEMI_ANNUAL")).toEqual(new Date(Date.UTC(2027, 0, 25)));
  });

  it("adds 12 months for ANNUAL", () => {
    expect(computeNextObligationDueDate(CLOSED_AT, "ANNUAL")).toEqual(new Date(Date.UTC(2027, 6, 25)));
  });

  it.each(["ONE_TIME", "AS_NEEDED"] as const)("returns null for %s (no fixed cycle)", (frequency) => {
    expect(computeNextObligationDueDate(CLOSED_AT, frequency)).toBeNull();
  });
});
