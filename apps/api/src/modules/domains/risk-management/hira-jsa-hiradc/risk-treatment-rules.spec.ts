import { assertAcceptRequiresTopManagementApproval } from "./risk-treatment-rules";

describe("assertAcceptRequiresTopManagementApproval (BR-06)", () => {
  it("throws when strategy=ACCEPT, source requires escalation, and no top-management approver", () => {
    expect(() => assertAcceptRequiresTopManagementApproval("ACCEPT", true, null)).toThrow(/BR-06/);
  });

  it("allows when strategy=ACCEPT, source requires escalation, and top-management approver present", () => {
    expect(() => assertAcceptRequiresTopManagementApproval("ACCEPT", true, "user-1")).not.toThrow();
  });

  it("allows strategy=ACCEPT on a source that does NOT require escalation, no approver needed", () => {
    expect(() => assertAcceptRequiresTopManagementApproval("ACCEPT", false, null)).not.toThrow();
  });

  it.each(["AVOID", "REDUCE_MITIGATE", "TRANSFER"] as const)(
    "allows strategy=%s on an escalation-requiring source without top-management approver (gate only applies to ACCEPT)",
    (strategy) => {
      expect(() => assertAcceptRequiresTopManagementApproval(strategy, true, null)).not.toThrow();
    },
  );
});
