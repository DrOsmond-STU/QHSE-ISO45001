import { validateRiskRegisterStatusTransition } from "./risk-register-lifecycle";

describe("validateRiskRegisterStatusTransition", () => {
  it.each([
    ["IDENTIFIED", "ASSESSED"],
    ["ASSESSED", "TREATMENT_IN_PROGRESS"],
    ["TREATMENT_IN_PROGRESS", "MONITORED"],
    ["MONITORED", "CLOSED"],
  ] as const)("allows %s -> %s", (from, to) => {
    expect(() => validateRiskRegisterStatusTransition(from, to)).not.toThrow();
  });

  it.each([
    ["IDENTIFIED", "MONITORED"],
    ["ASSESSED", "MONITORED"],
    ["ASSESSED", "CLOSED"],
    ["MONITORED", "TREATMENT_IN_PROGRESS"],
    ["CLOSED", "MONITORED"],
    ["CLOSED", "IDENTIFIED"],
  ] as const)("rejects %s -> %s", (from, to) => {
    expect(() => validateRiskRegisterStatusTransition(from, to)).toThrow();
  });
});
