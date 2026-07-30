import { validateRiskTreatmentStatusTransition } from "./risk-treatment-lifecycle";

describe("validateRiskTreatmentStatusTransition", () => {
  it.each([
    ["PLANNED", "IN_PROGRESS"],
    ["PLANNED", "CANCELLED"],
    ["IN_PROGRESS", "COMPLETED"],
    ["IN_PROGRESS", "CANCELLED"],
    ["COMPLETED", "VERIFIED_EFFECTIVE"],
  ] as const)("allows %s -> %s", (from, to) => {
    expect(() => validateRiskTreatmentStatusTransition(from, to)).not.toThrow();
  });

  it.each([
    ["PLANNED", "COMPLETED"],
    ["COMPLETED", "CANCELLED"],
    ["VERIFIED_EFFECTIVE", "PLANNED"],
    ["CANCELLED", "PLANNED"],
  ] as const)("rejects %s -> %s", (from, to) => {
    expect(() => validateRiskTreatmentStatusTransition(from, to)).toThrow();
  });
});
