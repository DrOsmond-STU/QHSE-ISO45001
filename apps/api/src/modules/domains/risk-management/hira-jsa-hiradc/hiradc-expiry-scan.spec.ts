import { findExpiredHiradcRecords, HiradcExpiryCandidate } from "./hiradc-expiry-scan";

const NOW = new Date("2026-07-25T00:00:00.000Z");

function candidate(overrides: Partial<HiradcExpiryCandidate>): HiradcExpiryCandidate {
  return { hiradcId: "hiradc-1", validUntil: null, status: "VERIFIED", ...overrides };
}

function hoursFromNow(hours: number): Date {
  return new Date(NOW.getTime() + hours * 60 * 60 * 1000);
}

describe("findExpiredHiradcRecords (BR-04)", () => {
  it("includes a record whose valid_until has passed", () => {
    const c = candidate({ validUntil: hoursFromNow(-1) });
    expect(findExpiredHiradcRecords([c], NOW)).toEqual([c]);
  });

  it.each(["DRAFT", "VERIFIED", "APPROVED"] as const)("catches expiry regardless of current status %s", (status) => {
    const c = candidate({ status, validUntil: hoursFromNow(-2) });
    expect(findExpiredHiradcRecords([c], NOW)).toEqual([c]);
  });

  it("excludes a record not yet past valid_until", () => {
    const c = candidate({ validUntil: hoursFromNow(2) });
    expect(findExpiredHiradcRecords([c], NOW)).toEqual([]);
  });

  it("excludes a record already EXPIRED (idempotent)", () => {
    const c = candidate({ status: "EXPIRED", validUntil: hoursFromNow(-2) });
    expect(findExpiredHiradcRecords([c], NOW)).toEqual([]);
  });

  it("excludes a record with null valid_until", () => {
    const c = candidate({ validUntil: null });
    expect(findExpiredHiradcRecords([c], NOW)).toEqual([]);
  });
});
