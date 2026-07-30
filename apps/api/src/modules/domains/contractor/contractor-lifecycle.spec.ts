import {
  areMandatoryDocumentsVerified,
  calculateDaysUntilExpiry,
  hasBlockingExpiredCompliance,
  isBlacklistTransition,
  isComplianceExpired,
  isConsecutiveUnacceptable,
  isContractorEligibleForAssignment,
  isPtk007ComplianceSatisfied,
  isWithinComplianceReminderWindow,
  isWorkerEligibleForActiveStatus,
} from "./contractor-lifecycle";

describe("contractor-lifecycle pure functions", () => {
  describe("isContractorEligibleForAssignment (BR-01)", () => {
    it("PREQUALIFIED -> eligible", () => {
      expect(isContractorEligibleForAssignment("PREQUALIFIED")).toBe(true);
    });
    it("ACTIVE -> eligible", () => {
      expect(isContractorEligibleForAssignment("ACTIVE")).toBe(true);
    });
    it("REGISTERED -> NOT eligible", () => {
      expect(isContractorEligibleForAssignment("REGISTERED")).toBe(false);
    });
    it("SUSPENDED -> NOT eligible", () => {
      expect(isContractorEligibleForAssignment("SUSPENDED")).toBe(false);
    });
    it("BLACKLISTED -> NOT eligible", () => {
      expect(isContractorEligibleForAssignment("BLACKLISTED")).toBe(false);
    });
    it("INACTIVE -> NOT eligible", () => {
      expect(isContractorEligibleForAssignment("INACTIVE")).toBe(false);
    });
  });

  describe("hasBlockingExpiredCompliance (BR-02)", () => {
    it("no EXPIRED rows -> not blocked", () => {
      expect(hasBlockingExpiredCompliance(["VALID", "EXPIRING_SOON"])).toBe(false);
    });
    it("one EXPIRED row -> blocked", () => {
      expect(hasBlockingExpiredCompliance(["VALID", "EXPIRED"])).toBe(true);
    });
    it("empty list -> not blocked", () => {
      expect(hasBlockingExpiredCompliance([])).toBe(false);
    });
  });

  describe("isWorkerEligibleForActiveStatus (BR-03)", () => {
    it("induction completed -> eligible", () => {
      expect(isWorkerEligibleForActiveStatus(true)).toBe(true);
    });
    it("induction NOT completed -> not eligible", () => {
      expect(isWorkerEligibleForActiveStatus(false)).toBe(false);
    });
  });

  describe("isPtk007ComplianceSatisfied (BR-04)", () => {
    it("non-OIL_GAS tenant -> always satisfied regardless of docs", () => {
      expect(isPtk007ComplianceSatisfied(false, [])).toBe(true);
    });
    it("OIL_GAS tenant with both IUJP+CSMS mandatory -> satisfied", () => {
      expect(
        isPtk007ComplianceSatisfied(true, [
          { category: "IUJP", isMandatoryForPtk007: true },
          { category: "CSMS_CERTIFICATE", isMandatoryForPtk007: true },
        ]),
      ).toBe(true);
    });
    it("OIL_GAS tenant missing CSMS -> NOT satisfied", () => {
      expect(isPtk007ComplianceSatisfied(true, [{ category: "IUJP", isMandatoryForPtk007: true }])).toBe(false);
    });
    it("OIL_GAS tenant with IUJP present but isMandatoryForPtk007=false -> NOT satisfied", () => {
      expect(
        isPtk007ComplianceSatisfied(true, [
          { category: "IUJP", isMandatoryForPtk007: false },
          { category: "CSMS_CERTIFICATE", isMandatoryForPtk007: true },
        ]),
      ).toBe(false);
    });
    it("OIL_GAS tenant with zero docs -> NOT satisfied", () => {
      expect(isPtk007ComplianceSatisfied(true, [])).toBe(false);
    });
  });

  describe("areMandatoryDocumentsVerified (BR-05)", () => {
    it("all mandatory docs VERIFIED -> true", () => {
      expect(
        areMandatoryDocumentsVerified([
          { isMandatory: true, status: "VERIFIED" },
          { isMandatory: true, status: "VERIFIED" },
        ]),
      ).toBe(true);
    });
    it("one mandatory doc NOT VERIFIED -> false", () => {
      expect(
        areMandatoryDocumentsVerified([
          { isMandatory: true, status: "VERIFIED" },
          { isMandatory: true, status: "PENDING" },
        ]),
      ).toBe(false);
    });
    it("non-mandatory doc unverified doesn't block", () => {
      expect(
        areMandatoryDocumentsVerified([
          { isMandatory: true, status: "VERIFIED" },
          { isMandatory: false, status: "PENDING" },
        ]),
      ).toBe(true);
    });
    it("empty document list -> vacuously true", () => {
      expect(areMandatoryDocumentsVerified([])).toBe(true);
    });
  });

  describe("isBlacklistTransition (BR-06)", () => {
    it("BLACKLISTED -> true", () => {
      expect(isBlacklistTransition("BLACKLISTED")).toBe(true);
    });
    it("SUSPENDED -> false", () => {
      expect(isBlacklistTransition("SUSPENDED")).toBe(false);
    });
    it("ACTIVE -> false", () => {
      expect(isBlacklistTransition("ACTIVE")).toBe(false);
    });
  });

  describe("isConsecutiveUnacceptable (BR-07)", () => {
    it("current UNACCEPTABLE + previous UNACCEPTABLE -> true", () => {
      expect(isConsecutiveUnacceptable("UNACCEPTABLE", "UNACCEPTABLE")).toBe(true);
    });
    it("current UNACCEPTABLE + previous POOR -> false", () => {
      expect(isConsecutiveUnacceptable("UNACCEPTABLE", "POOR")).toBe(false);
    });
    it("current UNACCEPTABLE + no previous evaluation -> false", () => {
      expect(isConsecutiveUnacceptable("UNACCEPTABLE", null)).toBe(false);
    });
    it("current GOOD + previous UNACCEPTABLE -> false", () => {
      expect(isConsecutiveUnacceptable("GOOD", "UNACCEPTABLE")).toBe(false);
    });
  });

  describe("isWithinComplianceReminderWindow", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    it("expiry 10 days out, reminder window 30 -> within window", () => {
      expect(isWithinComplianceReminderWindow(new Date("2026-06-11T00:00:00Z"), now, 30)).toBe(true);
    });
    it("expiry 40 days out, reminder window 30 -> NOT within window", () => {
      expect(isWithinComplianceReminderWindow(new Date("2026-07-11T00:00:00Z"), now, 30)).toBe(false);
    });
    it("expiry already passed -> NOT within window (handled by isComplianceExpired instead)", () => {
      expect(isWithinComplianceReminderWindow(new Date("2026-05-01T00:00:00Z"), now, 30)).toBe(false);
    });
    it("expiry exactly at window boundary -> within window (inclusive)", () => {
      expect(isWithinComplianceReminderWindow(new Date("2026-07-01T00:00:00Z"), now, 30)).toBe(true);
    });
  });

  describe("isComplianceExpired", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    it("expiry in the past -> expired", () => {
      expect(isComplianceExpired(new Date("2026-05-01T00:00:00Z"), now)).toBe(true);
    });
    it("expiry in the future -> not expired", () => {
      expect(isComplianceExpired(new Date("2026-07-01T00:00:00Z"), now)).toBe(false);
    });
  });

  describe("calculateDaysUntilExpiry", () => {
    it("computes whole-day difference", () => {
      expect(calculateDaysUntilExpiry(new Date("2026-06-11T00:00:00Z"), new Date("2026-06-01T00:00:00Z"))).toBe(10);
    });
    it("negative for already-expired dates", () => {
      expect(calculateDaysUntilExpiry(new Date("2026-05-25T00:00:00Z"), new Date("2026-06-01T00:00:00Z"))).toBe(-7);
    });
  });
});
