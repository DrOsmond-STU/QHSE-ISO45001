import { assertDeviationApprovedBeforeClose, shouldAutoCreateNcr, validateInspectionStatusTransition } from "./inspection-rules";

describe("validateInspectionStatusTransition", () => {
  it("mengizinkan alur penuh DRAFT->SUBMITTED->REVIEWED->CLOSED", () => {
    expect(() => validateInspectionStatusTransition("DRAFT", "SUBMITTED")).not.toThrow();
    expect(() => validateInspectionStatusTransition("SUBMITTED", "REVIEWED")).not.toThrow();
    expect(() => validateInspectionStatusTransition("REVIEWED", "CLOSED")).not.toThrow();
  });

  it("menolak lompat DRAFT langsung ke CLOSED", () => {
    expect(() => validateInspectionStatusTransition("DRAFT", "CLOSED")).toThrow(/tidak valid/);
  });
});

describe("shouldAutoCreateNcr (BR-03)", () => {
  it("TRUE utk FAIL pada FINAL", () => {
    expect(shouldAutoCreateNcr("FAIL", "FINAL")).toBe(true);
  });

  it("TRUE utk FAIL pada PRE_SHIPMENT", () => {
    expect(shouldAutoCreateNcr("FAIL", "PRE_SHIPMENT")).toBe(true);
  });

  it("FALSE utk FAIL pada INCOMING/IN_PROCESS", () => {
    expect(shouldAutoCreateNcr("FAIL", "INCOMING")).toBe(false);
    expect(shouldAutoCreateNcr("FAIL", "IN_PROCESS")).toBe(false);
  });

  it("FALSE utk PASS/CONDITIONAL_PASS pada FINAL", () => {
    expect(shouldAutoCreateNcr("PASS", "FINAL")).toBe(false);
    expect(shouldAutoCreateNcr("CONDITIONAL_PASS", "FINAL")).toBe(false);
  });
});

describe("assertDeviationApprovedBeforeClose (BR-08)", () => {
  it("menolak CLOSED USE_AS_IS_DEVIATION belum approved", () => {
    expect(() => assertDeviationApprovedBeforeClose("USE_AS_IS_DEVIATION", false)).toThrow(/BR-08/);
  });

  it("mengizinkan CLOSED USE_AS_IS_DEVIATION sudah approved", () => {
    expect(() => assertDeviationApprovedBeforeClose("USE_AS_IS_DEVIATION", true)).not.toThrow();
  });

  it("mengizinkan CLOSED disposisi lain tanpa approval", () => {
    expect(() => assertDeviationApprovedBeforeClose("ACCEPT", false)).not.toThrow();
    expect(() => assertDeviationApprovedBeforeClose(null, false)).not.toThrow();
  });
});
