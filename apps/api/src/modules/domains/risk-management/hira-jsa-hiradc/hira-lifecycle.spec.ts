import { anyHazardLineRequiresEscalation, validateHiraAssessmentStatusTransition } from "./hira-lifecycle";

describe("validateHiraAssessmentStatusTransition", () => {
  it.each([
    ["DRAFT", "IN_REVIEW"],
    ["IN_REVIEW", "APPROVED"],
    ["IN_REVIEW", "REQUIRES_REVISION"],
    ["REQUIRES_REVISION", "IN_REVIEW"],
    ["APPROVED", "ACTIVE"],
    ["ACTIVE", "ARCHIVED"],
  ] as const)("allows %s -> %s", (from, to) => {
    expect(() => validateHiraAssessmentStatusTransition(from, to)).not.toThrow();
  });

  it.each([
    ["DRAFT", "APPROVED"],
    ["DRAFT", "ACTIVE"],
    ["IN_REVIEW", "ACTIVE"],
    ["APPROVED", "ARCHIVED"],
    ["ACTIVE", "DRAFT"],
    ["ARCHIVED", "DRAFT"],
    ["REQUIRES_REVISION", "APPROVED"],
  ] as const)("rejects %s -> %s", (from, to) => {
    expect(() => validateHiraAssessmentStatusTransition(from, to)).toThrow();
  });
});

describe("anyHazardLineRequiresEscalation (PRD §4.1 poin 3 — percabangan kondisional)", () => {
  it("returns false when no line requires escalation", () => {
    expect(anyHazardLineRequiresEscalation([{ requiresEscalationBefore: false }, { requiresEscalationBefore: false }])).toBe(false);
  });

  it("returns true when at least one line requires escalation", () => {
    expect(anyHazardLineRequiresEscalation([{ requiresEscalationBefore: false }, { requiresEscalationBefore: true }])).toBe(true);
  });

  it("returns false for empty line list", () => {
    expect(anyHazardLineRequiresEscalation([])).toBe(false);
  });
});
