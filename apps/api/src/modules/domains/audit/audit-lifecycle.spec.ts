import { assertAuditCloseAllowed, computeTargetClosureDate, validateAuditStatusTransition } from "./audit-lifecycle";

describe("validateAuditStatusTransition", () => {
  it("mengizinkan jalur linear penuh PLANNED->...->CLOSED", () => {
    expect(() => validateAuditStatusTransition("PLANNED", "IN_PROGRESS")).not.toThrow();
    expect(() => validateAuditStatusTransition("IN_PROGRESS", "REPORT_DRAFTED")).not.toThrow();
    expect(() => validateAuditStatusTransition("REPORT_DRAFTED", "REPORT_APPROVED")).not.toThrow();
    expect(() => validateAuditStatusTransition("REPORT_APPROVED", "CLOSED")).not.toThrow();
  });

  it("mengizinkan REPORT_APPROVED->PENDING_CAPA_CLOSURE->CLOSED", () => {
    expect(() => validateAuditStatusTransition("REPORT_APPROVED", "PENDING_CAPA_CLOSURE")).not.toThrow();
    expect(() => validateAuditStatusTransition("PENDING_CAPA_CLOSURE", "CLOSED")).not.toThrow();
  });

  it("mengizinkan CANCELLED dari PLANNED/IN_PROGRESS", () => {
    expect(() => validateAuditStatusTransition("PLANNED", "CANCELLED")).not.toThrow();
    expect(() => validateAuditStatusTransition("IN_PROGRESS", "CANCELLED")).not.toThrow();
  });

  it("menolak lompat PLANNED->REPORT_DRAFTED", () => {
    expect(() => validateAuditStatusTransition("PLANNED", "REPORT_DRAFTED")).toThrow(/tidak valid/);
  });

  it("menolak transisi dari status terminal CLOSED", () => {
    expect(() => validateAuditStatusTransition("CLOSED", "PLANNED")).toThrow(/tidak valid/);
  });
});

describe("computeTargetClosureDate (BR-04)", () => {
  const identifiedAt = new Date("2026-07-01T00:00:00.000Z");

  it("Major NC -> +30 hari", () => {
    const result = computeTargetClosureDate(identifiedAt, "MAJOR_NC");
    expect(result?.toISOString().slice(0, 10)).toBe("2026-07-31");
  });

  it("Minor NC -> +60 hari", () => {
    const result = computeTargetClosureDate(identifiedAt, "MINOR_NC");
    expect(result?.toISOString().slice(0, 10)).toBe("2026-08-30");
  });

  it("Observation -> null (tanpa tenggat ketat)", () => {
    expect(computeTargetClosureDate(identifiedAt, "OBSERVATION")).toBeNull();
  });

  it("OFI -> null (tanpa tenggat ketat)", () => {
    expect(computeTargetClosureDate(identifiedAt, "OFI")).toBeNull();
  });
});

describe("assertAuditCloseAllowed (BR-02/BR-03)", () => {
  it("tidak throw kalau report APPROVED dan seluruh wajib-CAPA CLOSED", () => {
    expect(() =>
      assertAuditCloseAllowed(
        [
          { requiresCapa: true, status: "CLOSED" },
          { requiresCapa: false, status: "OPEN" },
        ],
        "APPROVED",
      ),
    ).not.toThrow();
  });

  it("throw kalau report belum APPROVED", () => {
    expect(() => assertAuditCloseAllowed([], null)).toThrow(/BR-03/);
  });

  it("throw kalau ada finding wajib-CAPA belum CLOSED", () => {
    expect(() =>
      assertAuditCloseAllowed([{ requiresCapa: true, status: "VERIFIED" }], "APPROVED"),
    ).toThrow(/BR-02\/BR-03/);
  });

  it("finding non-wajib-CAPA yang belum CLOSED tidak memblokir (§4 poin 9)", () => {
    expect(() =>
      assertAuditCloseAllowed([{ requiresCapa: false, status: "OPEN" }], "APPROVED"),
    ).not.toThrow();
  });
});
