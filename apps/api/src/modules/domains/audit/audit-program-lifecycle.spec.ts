import {
  assertPlanItemEditable,
  validateAuditProgramPlanItemStatusTransition,
  validateAuditProgramStatusTransition,
} from "./audit-program-lifecycle";

describe("validateAuditProgramStatusTransition", () => {
  it("mengizinkan DRAFT->APPROVED", () => {
    expect(() => validateAuditProgramStatusTransition("DRAFT", "APPROVED")).not.toThrow();
  });

  it("mengizinkan REJECT path DRAFT->DRAFT (no-op, dipanggil listener)", () => {
    expect(() => validateAuditProgramStatusTransition("DRAFT", "CANCELLED")).not.toThrow();
  });

  it("mengizinkan APPROVED->IN_PROGRESS->COMPLETED", () => {
    expect(() => validateAuditProgramStatusTransition("APPROVED", "IN_PROGRESS")).not.toThrow();
    expect(() => validateAuditProgramStatusTransition("IN_PROGRESS", "COMPLETED")).not.toThrow();
  });

  it("menolak transisi dari status terminal COMPLETED", () => {
    expect(() => validateAuditProgramStatusTransition("COMPLETED", "IN_PROGRESS")).toThrow(/tidak valid/);
  });

  it("menolak DRAFT->IN_PROGRESS (lompat approval)", () => {
    expect(() => validateAuditProgramStatusTransition("DRAFT", "IN_PROGRESS")).toThrow(/tidak valid/);
  });
});

describe("validateAuditProgramPlanItemStatusTransition", () => {
  it("mengizinkan PLANNED->SCHEDULED->EXECUTED", () => {
    expect(() => validateAuditProgramPlanItemStatusTransition("PLANNED", "SCHEDULED")).not.toThrow();
    expect(() => validateAuditProgramPlanItemStatusTransition("SCHEDULED", "EXECUTED")).not.toThrow();
  });

  it("mengizinkan PLANNED->EXECUTED langsung (ad-hoc tanpa SCHEDULED)", () => {
    expect(() => validateAuditProgramPlanItemStatusTransition("PLANNED", "EXECUTED")).not.toThrow();
  });

  it("menolak transisi dari EXECUTED (terminal)", () => {
    expect(() => validateAuditProgramPlanItemStatusTransition("EXECUTED", "CANCELLED")).toThrow(/tidak valid/);
  });
});

describe("assertPlanItemEditable (BR-06)", () => {
  it("tidak throw utk status PLANNED/SCHEDULED/CANCELLED", () => {
    expect(() => assertPlanItemEditable("PLANNED")).not.toThrow();
    expect(() => assertPlanItemEditable("SCHEDULED")).not.toThrow();
    expect(() => assertPlanItemEditable("CANCELLED")).not.toThrow();
  });

  it("throw kalau status EXECUTED", () => {
    expect(() => assertPlanItemEditable("EXECUTED")).toThrow(/BR-06/);
  });
});
