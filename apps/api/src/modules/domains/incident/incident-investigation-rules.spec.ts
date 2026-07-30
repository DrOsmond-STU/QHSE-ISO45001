import { assertInvestigationApprovedIfRequiredForClosure } from "./incident-investigation-rules";

describe("assertInvestigationApprovedIfRequiredForClosure (BR-01)", () => {
  it.each(["FATALITY", "LOST_TIME_INJURY", "PROCESS_SAFETY_EVENT"] as const)(
    "%s tanpa investigasi APPROVED -> throw",
    (classification) => {
      expect(() => assertInvestigationApprovedIfRequiredForClosure(classification, null)).toThrow();
      expect(() => assertInvestigationApprovedIfRequiredForClosure(classification, "IN_PROGRESS")).toThrow();
      expect(() => assertInvestigationApprovedIfRequiredForClosure(classification, "PENDING_REVIEW")).toThrow();
    },
  );

  it.each(["FATALITY", "LOST_TIME_INJURY", "PROCESS_SAFETY_EVENT"] as const)(
    "%s dengan investigasi APPROVED -> lolos",
    (classification) => {
      expect(() => assertInvestigationApprovedIfRequiredForClosure(classification, "APPROVED")).not.toThrow();
    },
  );

  it("RESTRICTED_WORK_CASE TIDAK di-gate (beda dari daftar §4, BR-01 literal hanya 3 klasifikasi)", () => {
    expect(() => assertInvestigationApprovedIfRequiredForClosure("RESTRICTED_WORK_CASE", null)).not.toThrow();
  });

  it("NEAR_MISS tanpa investigasi -> lolos (tidak wajib)", () => {
    expect(() => assertInvestigationApprovedIfRequiredForClosure("NEAR_MISS", null)).not.toThrow();
  });
});
