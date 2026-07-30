import { validateWorkPermitStatusTransition } from "./work-permit-lifecycle";

describe("validateWorkPermitStatusTransition", () => {
  it("mengizinkan DRAFT -> PENDING_ISSUER_APPROVAL (submit)", () => {
    expect(() => validateWorkPermitStatusTransition("DRAFT", "PENDING_ISSUER_APPROVAL")).not.toThrow();
  });

  it("mengizinkan DRAFT -> CANCELLED", () => {
    expect(() => validateWorkPermitStatusTransition("DRAFT", "CANCELLED")).not.toThrow();
  });

  it("mengizinkan PENDING_ISSUER_APPROVAL -> PENDING_HSE_APPROVAL (kondisional BR-04)", () => {
    expect(() => validateWorkPermitStatusTransition("PENDING_ISSUER_APPROVAL", "PENDING_HSE_APPROVAL")).not.toThrow();
  });

  it("mengizinkan PENDING_ISSUER_APPROVAL -> APPROVED (tanpa HSE stage)", () => {
    expect(() => validateWorkPermitStatusTransition("PENDING_ISSUER_APPROVAL", "APPROVED")).not.toThrow();
  });

  it("mengizinkan PENDING_HSE_APPROVAL -> APPROVED", () => {
    expect(() => validateWorkPermitStatusTransition("PENDING_HSE_APPROVAL", "APPROVED")).not.toThrow();
  });

  it("mengizinkan PENDING_ISSUER_APPROVAL/PENDING_HSE_APPROVAL -> REJECTED", () => {
    expect(() => validateWorkPermitStatusTransition("PENDING_ISSUER_APPROVAL", "REJECTED")).not.toThrow();
    expect(() => validateWorkPermitStatusTransition("PENDING_HSE_APPROVAL", "REJECTED")).not.toThrow();
  });

  it("mengizinkan APPROVED -> ACTIVE", () => {
    expect(() => validateWorkPermitStatusTransition("APPROVED", "ACTIVE")).not.toThrow();
  });

  it("mengizinkan CANCELLED dari DRAFT/PENDING_ISSUER_APPROVAL/PENDING_HSE_APPROVAL/APPROVED", () => {
    expect(() => validateWorkPermitStatusTransition("PENDING_ISSUER_APPROVAL", "CANCELLED")).not.toThrow();
    expect(() => validateWorkPermitStatusTransition("PENDING_HSE_APPROVAL", "CANCELLED")).not.toThrow();
    expect(() => validateWorkPermitStatusTransition("APPROVED", "CANCELLED")).not.toThrow();
  });

  it("mengizinkan ACTIVE -> EXTENSION_REQUESTED/PENDING_CLOSURE/SUSPENDED/EXPIRED (task 3.4)", () => {
    expect(() => validateWorkPermitStatusTransition("ACTIVE", "EXTENSION_REQUESTED")).not.toThrow();
    expect(() => validateWorkPermitStatusTransition("ACTIVE", "PENDING_CLOSURE")).not.toThrow();
    expect(() => validateWorkPermitStatusTransition("ACTIVE", "SUSPENDED")).not.toThrow();
    expect(() => validateWorkPermitStatusTransition("ACTIVE", "EXPIRED")).not.toThrow();
  });

  it("menolak ACTIVE -> CLOSED langsung (wajib lewat PENDING_CLOSURE)", () => {
    expect(() => validateWorkPermitStatusTransition("ACTIVE", "CLOSED")).toThrow();
  });

  it("mengizinkan EXTENSION_REQUESTED -> ACTIVE (extension APPROVED maupun REJECTED sama-sama kembali ACTIVE)", () => {
    expect(() => validateWorkPermitStatusTransition("EXTENSION_REQUESTED", "ACTIVE")).not.toThrow();
  });

  it("mengizinkan PENDING_CLOSURE -> CLOSED (closure VERIFIED) dan -> ACTIVE (closure RETURNED)", () => {
    expect(() => validateWorkPermitStatusTransition("PENDING_CLOSURE", "CLOSED")).not.toThrow();
    expect(() => validateWorkPermitStatusTransition("PENDING_CLOSURE", "ACTIVE")).not.toThrow();
  });

  it("mengizinkan SUSPENDED -> ACTIVE (retest gas baru PASS)", () => {
    expect(() => validateWorkPermitStatusTransition("SUSPENDED", "ACTIVE")).not.toThrow();
  });

  it("menolak dari CLOSED/EXPIRED (terminal, task 3.4)", () => {
    expect(() => validateWorkPermitStatusTransition("CLOSED", "PENDING_CLOSURE")).toThrow();
    expect(() => validateWorkPermitStatusTransition("EXPIRED", "ACTIVE")).toThrow();
  });

  it("menolak transisi mundur (APPROVED -> DRAFT)", () => {
    expect(() => validateWorkPermitStatusTransition("APPROVED", "DRAFT")).toThrow();
  });

  it("menolak DRAFT -> APPROVED (lompat stage)", () => {
    expect(() => validateWorkPermitStatusTransition("DRAFT", "APPROVED")).toThrow();
  });

  it("menolak dari status terminal (REJECTED/CANCELLED/CLOSED)", () => {
    expect(() => validateWorkPermitStatusTransition("REJECTED", "DRAFT")).toThrow();
    expect(() => validateWorkPermitStatusTransition("CANCELLED", "DRAFT")).toThrow();
    expect(() => validateWorkPermitStatusTransition("CLOSED", "ACTIVE")).toThrow();
  });

  it("SUBMITTED tidak reachable dari mana pun maupun menuju ke mana pun (gap TDD §26, nilai enum literal tidak dipakai task 3.3)", () => {
    expect(() => validateWorkPermitStatusTransition("SUBMITTED", "PENDING_ISSUER_APPROVAL")).toThrow();
    expect(() => validateWorkPermitStatusTransition("DRAFT", "SUBMITTED")).toThrow();
  });
});
