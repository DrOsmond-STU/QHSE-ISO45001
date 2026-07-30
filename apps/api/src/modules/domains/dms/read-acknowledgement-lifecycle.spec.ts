import { validateAcknowledgementTransition } from "./read-acknowledgement-lifecycle";

describe("validateAcknowledgementTransition (BR-04)", () => {
  it("PENDING -> VIEWED selalu diizinkan", () => {
    expect(() => validateAcknowledgementTransition("PENDING", "VIEWED", null)).not.toThrow();
  });

  it("VIEWED -> ACKNOWLEDGED selalu diizinkan (kedua method)", () => {
    expect(() => validateAcknowledgementTransition("VIEWED", "ACKNOWLEDGED", "IN_APP_CLICK")).not.toThrow();
    expect(() => validateAcknowledgementTransition("VIEWED", "ACKNOWLEDGED", "E_SIGNATURE")).not.toThrow();
  });

  it("PENDING -> ACKNOWLEDGED langsung DITOLAK untuk IN_APP_CLICK (wajib lewat VIEWED)", () => {
    expect(() => validateAcknowledgementTransition("PENDING", "ACKNOWLEDGED", "IN_APP_CLICK")).toThrow();
  });

  it("PENDING -> ACKNOWLEDGED langsung DIIZINKAN untuk E_SIGNATURE (PRD BR-04 pengecualian eksplisit)", () => {
    expect(() => validateAcknowledgementTransition("PENDING", "ACKNOWLEDGED", "E_SIGNATURE")).not.toThrow();
  });

  it.each(["PENDING", "VIEWED"] as const)("%s -> OVERDUE diizinkan (job SLA scan)", (from) => {
    expect(() => validateAcknowledgementTransition(from, "OVERDUE", null)).not.toThrow();
  });

  it("ACKNOWLEDGED -> apa pun ditolak (status terminal)", () => {
    expect(() => validateAcknowledgementTransition("ACKNOWLEDGED", "VIEWED", null)).toThrow();
    expect(() => validateAcknowledgementTransition("ACKNOWLEDGED", "OVERDUE", null)).toThrow();
  });

  it("OVERDUE -> VIEWED/ACKNOWLEDGED DIIZINKAN (late-acknowledgement, BEYOND diagram literal PRD — lihat banner comment)", () => {
    expect(() => validateAcknowledgementTransition("OVERDUE", "VIEWED", null)).not.toThrow();
    expect(() => validateAcknowledgementTransition("OVERDUE", "ACKNOWLEDGED", "IN_APP_CLICK")).not.toThrow();
  });

  it("OVERDUE -> OVERDUE (re-scan) ditolak — bukan transisi bermakna", () => {
    expect(() => validateAcknowledgementTransition("OVERDUE", "OVERDUE", null)).toThrow();
  });
});
