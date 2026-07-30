import {
  isReassessmentDue,
  requiresRestrictedDutyAssignment,
  validateFitToWorkAssessmentStatusTransition,
  validateRestrictedDutyAssignmentStatusTransition,
} from "./fit-to-work-lifecycle";

describe("validateFitToWorkAssessmentStatusTransition", () => {
  it("ACTIVE->EXPIRED valid", () => {
    expect(() => validateFitToWorkAssessmentStatusTransition("ACTIVE", "EXPIRED")).not.toThrow();
  });

  it("ACTIVE->SUPERSEDED valid", () => {
    expect(() => validateFitToWorkAssessmentStatusTransition("ACTIVE", "SUPERSEDED")).not.toThrow();
  });

  it("EXPIRED->apa pun ditolak (status terminal)", () => {
    expect(() => validateFitToWorkAssessmentStatusTransition("EXPIRED", "ACTIVE")).toThrow(/tidak valid/);
  });
});

describe("requiresRestrictedDutyAssignment", () => {
  it("true untuk FIT_WITH_RESTRICTION", () => {
    expect(requiresRestrictedDutyAssignment("FIT_WITH_RESTRICTION")).toBe(true);
  });

  it("true untuk TEMPORARY_UNFIT", () => {
    expect(requiresRestrictedDutyAssignment("TEMPORARY_UNFIT")).toBe(true);
  });

  it("false untuk FIT (tidak perlu pembatasan)", () => {
    expect(requiresRestrictedDutyAssignment("FIT")).toBe(false);
  });

  it("false untuk UNFIT (tidak bisa bekerja sama sekali, bukan tugas terbatas)", () => {
    expect(requiresRestrictedDutyAssignment("UNFIT")).toBe(false);
  });
});

describe("isReassessmentDue", () => {
  it("false jika next_reassessment_date null", () => {
    expect(isReassessmentDue(null, new Date("2026-08-01"))).toBe(false);
  });

  it("true jika tanggal sudah lewat", () => {
    expect(isReassessmentDue(new Date("2026-07-01"), new Date("2026-08-01"))).toBe(true);
  });

  it("true jika tepat hari ini", () => {
    const d = new Date("2026-08-01");
    expect(isReassessmentDue(d, d)).toBe(true);
  });

  it("false jika masih di masa depan", () => {
    expect(isReassessmentDue(new Date("2026-09-01"), new Date("2026-08-01"))).toBe(false);
  });
});

describe("validateRestrictedDutyAssignmentStatusTransition", () => {
  it("ACTIVE->COMPLETED valid", () => {
    expect(() => validateRestrictedDutyAssignmentStatusTransition("ACTIVE", "COMPLETED")).not.toThrow();
  });

  it("ACTIVE->ESCALATED_NON_COMPLIANT valid", () => {
    expect(() => validateRestrictedDutyAssignmentStatusTransition("ACTIVE", "ESCALATED_NON_COMPLIANT")).not.toThrow();
  });

  it("COMPLETED->apa pun ditolak (status terminal)", () => {
    expect(() => validateRestrictedDutyAssignmentStatusTransition("COMPLETED", "ACTIVE")).toThrow(/tidak valid/);
  });
});
