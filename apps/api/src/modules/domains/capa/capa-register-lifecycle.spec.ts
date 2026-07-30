import { resolveEffectivenessOutcome, validateCapaRegisterStatusTransition } from "./capa-register-lifecycle";

describe("validateCapaRegisterStatusTransition", () => {
  it("mengizinkan jalur linear penuh DRAFT->...->PENDING_EFFECTIVENESS_VERIFICATION", () => {
    expect(() => validateCapaRegisterStatusTransition("DRAFT", "ROOT_CAUSE_ANALYSIS")).not.toThrow();
    expect(() => validateCapaRegisterStatusTransition("ROOT_CAUSE_ANALYSIS", "ACTION_PLAN_DEFINED")).not.toThrow();
    expect(() => validateCapaRegisterStatusTransition("ACTION_PLAN_DEFINED", "PENDING_APPROVAL")).not.toThrow();
    expect(() => validateCapaRegisterStatusTransition("PENDING_APPROVAL", "IN_PROGRESS")).not.toThrow();
    expect(() => validateCapaRegisterStatusTransition("IN_PROGRESS", "PENDING_EFFECTIVENESS_VERIFICATION")).not.toThrow();
  });

  it("mengizinkan PENDING_APPROVAL->ACTION_PLAN_DEFINED (reject path)", () => {
    expect(() => validateCapaRegisterStatusTransition("PENDING_APPROVAL", "ACTION_PLAN_DEFINED")).not.toThrow();
  });

  it("mengizinkan PENDING_EFFECTIVENESS_VERIFICATION->EFFECTIVE_CLOSED dan ->NOT_EFFECTIVE_REOPENED", () => {
    expect(() => validateCapaRegisterStatusTransition("PENDING_EFFECTIVENESS_VERIFICATION", "EFFECTIVE_CLOSED")).not.toThrow();
    expect(() => validateCapaRegisterStatusTransition("PENDING_EFFECTIVENESS_VERIFICATION", "NOT_EFFECTIVE_REOPENED")).not.toThrow();
  });

  it("BR-04 — NOT_EFFECTIVE_REOPENED HANYA bisa ke ROOT_CAUSE_ANALYSIS (tidak bisa lompat ke ACTION_PLAN_DEFINED)", () => {
    expect(() => validateCapaRegisterStatusTransition("NOT_EFFECTIVE_REOPENED", "ROOT_CAUSE_ANALYSIS")).not.toThrow();
    expect(() => validateCapaRegisterStatusTransition("NOT_EFFECTIVE_REOPENED", "ACTION_PLAN_DEFINED")).toThrow(/tidak valid/);
  });

  it("mengizinkan reopen manual EFFECTIVE_CLOSED->NOT_EFFECTIVE_REOPENED", () => {
    expect(() => validateCapaRegisterStatusTransition("EFFECTIVE_CLOSED", "NOT_EFFECTIVE_REOPENED")).not.toThrow();
  });

  it("menolak transisi dari status terminal CANCELLED", () => {
    expect(() => validateCapaRegisterStatusTransition("CANCELLED", "DRAFT")).toThrow(/tidak valid/);
  });

  it("menolak lompat DRAFT->PENDING_APPROVAL", () => {
    expect(() => validateCapaRegisterStatusTransition("DRAFT", "PENDING_APPROVAL")).toThrow(/tidak valid/);
  });
});

describe("resolveEffectivenessOutcome (BR-01/BR-04)", () => {
  it("EFFECTIVE -> EFFECTIVE_CLOSED", () => {
    expect(resolveEffectivenessOutcome("EFFECTIVE")).toBe("EFFECTIVE_CLOSED");
  });

  it("NOT_EFFECTIVE -> NOT_EFFECTIVE_REOPENED", () => {
    expect(resolveEffectivenessOutcome("NOT_EFFECTIVE")).toBe("NOT_EFFECTIVE_REOPENED");
  });

  it("throw kalau result masih PENDING", () => {
    expect(() => resolveEffectivenessOutcome("PENDING")).toThrow(/BR-01/);
  });
});
