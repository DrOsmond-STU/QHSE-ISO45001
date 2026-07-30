import {
  findExpiredLicenses,
  findLicenseExpiryReminderTiers,
  findLicensesEnteringExpiringSoon,
  LicenseExpiryCandidate,
} from "./license-expiry-scan";

const NOW = new Date("2026-07-25T00:00:00.000Z");

function candidate(overrides: Partial<LicenseExpiryCandidate>): LicenseExpiryCandidate {
  return {
    licenseId: "lic-1",
    expiryDate: null,
    renewalLeadTimeDays: 90,
    status: "ACTIVE",
    expiryReminder90SentAt: null,
    expiryReminder30SentAt: null,
    expiryReminder7SentAt: null,
    ...overrides,
  };
}

function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}

describe("findLicensesEnteringExpiringSoon (BR-01)", () => {
  it("includes ACTIVE license within renewal_lead_time_days window", () => {
    const c = candidate({ status: "ACTIVE", renewalLeadTimeDays: 90, expiryDate: daysFromNow(60) });
    expect(findLicensesEnteringExpiringSoon([c], NOW)).toEqual([c]);
  });

  it("includes at exact boundary (daysUntilExpiry === renewalLeadTimeDays)", () => {
    const c = candidate({ status: "ACTIVE", renewalLeadTimeDays: 90, expiryDate: daysFromNow(90) });
    expect(findLicensesEnteringExpiringSoon([c], NOW)).toEqual([c]);
  });

  it("excludes ACTIVE license outside the lead-time window", () => {
    const c = candidate({ status: "ACTIVE", renewalLeadTimeDays: 90, expiryDate: daysFromNow(120) });
    expect(findLicensesEnteringExpiringSoon([c], NOW)).toEqual([]);
  });

  it.each(["EXPIRING_SOON", "EXPIRED", "REVOKED", "IN_RENEWAL_PROCESS"] as const)(
    "excludes license already in status %s (idempotent)",
    (status) => {
      const c = candidate({ status, renewalLeadTimeDays: 90, expiryDate: daysFromNow(10) });
      expect(findLicensesEnteringExpiringSoon([c], NOW)).toEqual([]);
    },
  );

  it("excludes license with null expiry_date", () => {
    const c = candidate({ status: "ACTIVE", expiryDate: null });
    expect(findLicensesEnteringExpiringSoon([c], NOW)).toEqual([]);
  });
});

describe("findExpiredLicenses (BR-02)", () => {
  it.each(["ACTIVE", "EXPIRING_SOON", "IN_RENEWAL_PROCESS"] as const)(
    "transitions %s license whose expiry_date has passed",
    (status) => {
      const c = candidate({ status, expiryDate: daysFromNow(-1) });
      expect(findExpiredLicenses([c], NOW)).toEqual([c]);
    },
  );

  it("excludes license expiring exactly today (not yet < now)", () => {
    const c = candidate({ status: "ACTIVE", expiryDate: NOW });
    expect(findExpiredLicenses([c], NOW)).toEqual([]);
  });

  it("excludes license not yet past expiry", () => {
    const c = candidate({ status: "EXPIRING_SOON", expiryDate: daysFromNow(5) });
    expect(findExpiredLicenses([c], NOW)).toEqual([]);
  });

  it.each(["EXPIRED", "REVOKED"] as const)("excludes license already in terminal status %s", (status) => {
    const c = candidate({ status, expiryDate: daysFromNow(-30) });
    expect(findExpiredLicenses([c], NOW)).toEqual([]);
  });

  it("excludes license with null expiry_date", () => {
    const c = candidate({ status: "ACTIVE", expiryDate: null });
    expect(findExpiredLicenses([c], NOW)).toEqual([]);
  });
});

describe("findLicenseExpiryReminderTiers (PRD §4.3/§8 — H-90/H-30/H-7)", () => {
  it("fires only tier 90 when 60 days remain and no tier sent yet", () => {
    const c = candidate({ expiryDate: daysFromNow(60) });
    expect(findLicenseExpiryReminderTiers([c], NOW)).toEqual([{ licenseId: "lic-1", tier: 90 }]);
  });

  it("fires tiers 90 and 30 together when 25 days remain and neither sent (catch-up)", () => {
    const c = candidate({ expiryDate: daysFromNow(25) });
    expect(findLicenseExpiryReminderTiers([c], NOW)).toEqual([
      { licenseId: "lic-1", tier: 90 },
      { licenseId: "lic-1", tier: 30 },
    ]);
  });

  it("fires all 3 tiers together when 5 days remain and none sent (job absent for a long time)", () => {
    const c = candidate({ expiryDate: daysFromNow(5) });
    expect(findLicenseExpiryReminderTiers([c], NOW)).toEqual([
      { licenseId: "lic-1", tier: 90 },
      { licenseId: "lic-1", tier: 30 },
      { licenseId: "lic-1", tier: 7 },
    ]);
  });

  it("skips tier already sent even though still within its window", () => {
    const c = candidate({ expiryDate: daysFromNow(20), expiryReminder90SentAt: daysFromNow(-40) });
    expect(findLicenseExpiryReminderTiers([c], NOW)).toEqual([{ licenseId: "lic-1", tier: 30 }]);
  });

  it("fires nothing once all 3 tiers already sent", () => {
    const c = candidate({
      expiryDate: daysFromNow(3),
      expiryReminder90SentAt: daysFromNow(-80),
      expiryReminder30SentAt: daysFromNow(-20),
      expiryReminder7SentAt: daysFromNow(-4),
    });
    expect(findLicenseExpiryReminderTiers([c], NOW)).toEqual([]);
  });

  it.each(["EXPIRED", "REVOKED"] as const)("excludes license in terminal status %s", (status) => {
    const c = candidate({ status, expiryDate: daysFromNow(3) });
    expect(findLicenseExpiryReminderTiers([c], NOW)).toEqual([]);
  });

  it("excludes license with null expiry_date", () => {
    const c = candidate({ expiryDate: null });
    expect(findLicenseExpiryReminderTiers([c], NOW)).toEqual([]);
  });

  it("excludes license outside all 3 windows", () => {
    const c = candidate({ expiryDate: daysFromNow(200) });
    expect(findLicenseExpiryReminderTiers([c], NOW)).toEqual([]);
  });
});
