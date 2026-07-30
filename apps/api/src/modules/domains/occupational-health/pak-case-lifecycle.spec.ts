import {
  requiresDisnakerReporting,
  requiresTopManagementEscalation,
  validatePakCaseStatusTransition,
} from "./pak-case-lifecycle";

describe("validatePakCaseStatusTransition", () => {
  it("OPEN->UNDER_TREATMENT valid", () => {
    expect(() => validatePakCaseStatusTransition("OPEN", "UNDER_TREATMENT")).not.toThrow();
  });

  it("OPEN->CLOSED valid (bisa langsung tutup tanpa treatment)", () => {
    expect(() => validatePakCaseStatusTransition("OPEN", "CLOSED")).not.toThrow();
  });

  it("OPEN->DECEASED valid", () => {
    expect(() => validatePakCaseStatusTransition("OPEN", "DECEASED")).not.toThrow();
  });

  it("RECOVERED->CLOSED valid", () => {
    expect(() => validatePakCaseStatusTransition("RECOVERED", "CLOSED")).not.toThrow();
  });

  it("RECOVERED->UNDER_TREATMENT ditolak (tidak mundur)", () => {
    expect(() => validatePakCaseStatusTransition("RECOVERED", "UNDER_TREATMENT")).toThrow(/tidak valid/);
  });

  it("CLOSED->apa pun ditolak (status terminal)", () => {
    expect(() => validatePakCaseStatusTransition("CLOSED", "OPEN")).toThrow(/tidak valid/);
  });

  it("DECEASED->apa pun ditolak (status terminal)", () => {
    expect(() => validatePakCaseStatusTransition("DECEASED", "CLOSED")).toThrow(/tidak valid/);
  });
});

describe("requiresTopManagementEscalation (BR-08)", () => {
  it("true untuk SEVERE/PERMANENT_DISABILITY/FATAL", () => {
    expect(requiresTopManagementEscalation("SEVERE")).toBe(true);
    expect(requiresTopManagementEscalation("PERMANENT_DISABILITY")).toBe(true);
    expect(requiresTopManagementEscalation("FATAL")).toBe(true);
  });

  it("false untuk MILD/MODERATE", () => {
    expect(requiresTopManagementEscalation("MILD")).toBe(false);
    expect(requiresTopManagementEscalation("MODERATE")).toBe(false);
  });
});

describe("requiresDisnakerReporting", () => {
  it("true untuk CONFIRMED_WORK_RELATED", () => {
    expect(requiresDisnakerReporting("CONFIRMED_WORK_RELATED")).toBe(true);
  });

  it("false untuk SUSPECTED/NOT_WORK_RELATED/UNDER_INVESTIGATION", () => {
    expect(requiresDisnakerReporting("SUSPECTED")).toBe(false);
    expect(requiresDisnakerReporting("NOT_WORK_RELATED")).toBe(false);
    expect(requiresDisnakerReporting("UNDER_INVESTIGATION")).toBe(false);
  });
});
