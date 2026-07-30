import { resolveDefaultRequiresCapa, validateAuditFindingStatusTransition } from "./audit-finding-rules";

describe("resolveDefaultRequiresCapa", () => {
  it("MAJOR_NC -> true", () => {
    expect(resolveDefaultRequiresCapa("MAJOR_NC")).toBe(true);
  });

  it("MINOR_NC -> true", () => {
    expect(resolveDefaultRequiresCapa("MINOR_NC")).toBe(true);
  });

  it("OBSERVATION -> false", () => {
    expect(resolveDefaultRequiresCapa("OBSERVATION")).toBe(false);
  });

  it("OFI -> false", () => {
    expect(resolveDefaultRequiresCapa("OFI")).toBe(false);
  });
});

describe("validateAuditFindingStatusTransition", () => {
  it("requiresCapa=true: OPEN->CAPA_LINKED->VERIFIED->CLOSED", () => {
    expect(() => validateAuditFindingStatusTransition("OPEN", "CAPA_LINKED", true)).not.toThrow();
    expect(() => validateAuditFindingStatusTransition("CAPA_LINKED", "VERIFIED", true)).not.toThrow();
    expect(() => validateAuditFindingStatusTransition("VERIFIED", "CLOSED", true)).not.toThrow();
  });

  it("requiresCapa=true: menolak OPEN->CLOSED langsung (wajib lewat CAPA_LINKED/VERIFIED)", () => {
    expect(() => validateAuditFindingStatusTransition("OPEN", "CLOSED", true)).toThrow(/tidak valid/);
  });

  it("requiresCapa=false: mengizinkan OPEN->CLOSED langsung (§4 poin 9)", () => {
    expect(() => validateAuditFindingStatusTransition("OPEN", "CLOSED", false)).not.toThrow();
  });

  it("requiresCapa=false: tetap boleh OPEN->CAPA_LINKED (Observation/OFI opsional jadi CAPA preventive)", () => {
    expect(() => validateAuditFindingStatusTransition("OPEN", "CAPA_LINKED", false)).not.toThrow();
  });

  it("menolak transisi dari status terminal CLOSED", () => {
    expect(() => validateAuditFindingStatusTransition("CLOSED", "OPEN", true)).toThrow(/tidak valid/);
  });
});
