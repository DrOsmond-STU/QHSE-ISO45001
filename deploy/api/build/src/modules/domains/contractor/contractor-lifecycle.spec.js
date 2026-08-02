"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contractor_lifecycle_1 = require("./contractor-lifecycle");
describe("contractor-lifecycle pure functions", () => {
    describe("isContractorEligibleForAssignment (BR-01)", () => {
        it("PREQUALIFIED -> eligible", () => {
            expect((0, contractor_lifecycle_1.isContractorEligibleForAssignment)("PREQUALIFIED")).toBe(true);
        });
        it("ACTIVE -> eligible", () => {
            expect((0, contractor_lifecycle_1.isContractorEligibleForAssignment)("ACTIVE")).toBe(true);
        });
        it("REGISTERED -> NOT eligible", () => {
            expect((0, contractor_lifecycle_1.isContractorEligibleForAssignment)("REGISTERED")).toBe(false);
        });
        it("SUSPENDED -> NOT eligible", () => {
            expect((0, contractor_lifecycle_1.isContractorEligibleForAssignment)("SUSPENDED")).toBe(false);
        });
        it("BLACKLISTED -> NOT eligible", () => {
            expect((0, contractor_lifecycle_1.isContractorEligibleForAssignment)("BLACKLISTED")).toBe(false);
        });
        it("INACTIVE -> NOT eligible", () => {
            expect((0, contractor_lifecycle_1.isContractorEligibleForAssignment)("INACTIVE")).toBe(false);
        });
    });
    describe("hasBlockingExpiredCompliance (BR-02)", () => {
        it("no EXPIRED rows -> not blocked", () => {
            expect((0, contractor_lifecycle_1.hasBlockingExpiredCompliance)(["VALID", "EXPIRING_SOON"])).toBe(false);
        });
        it("one EXPIRED row -> blocked", () => {
            expect((0, contractor_lifecycle_1.hasBlockingExpiredCompliance)(["VALID", "EXPIRED"])).toBe(true);
        });
        it("empty list -> not blocked", () => {
            expect((0, contractor_lifecycle_1.hasBlockingExpiredCompliance)([])).toBe(false);
        });
    });
    describe("isWorkerEligibleForActiveStatus (BR-03)", () => {
        it("induction completed -> eligible", () => {
            expect((0, contractor_lifecycle_1.isWorkerEligibleForActiveStatus)(true)).toBe(true);
        });
        it("induction NOT completed -> not eligible", () => {
            expect((0, contractor_lifecycle_1.isWorkerEligibleForActiveStatus)(false)).toBe(false);
        });
    });
    describe("isPtk007ComplianceSatisfied (BR-04)", () => {
        it("non-OIL_GAS tenant -> always satisfied regardless of docs", () => {
            expect((0, contractor_lifecycle_1.isPtk007ComplianceSatisfied)(false, [])).toBe(true);
        });
        it("OIL_GAS tenant with both IUJP+CSMS mandatory -> satisfied", () => {
            expect((0, contractor_lifecycle_1.isPtk007ComplianceSatisfied)(true, [
                { category: "IUJP", isMandatoryForPtk007: true },
                { category: "CSMS_CERTIFICATE", isMandatoryForPtk007: true },
            ])).toBe(true);
        });
        it("OIL_GAS tenant missing CSMS -> NOT satisfied", () => {
            expect((0, contractor_lifecycle_1.isPtk007ComplianceSatisfied)(true, [{ category: "IUJP", isMandatoryForPtk007: true }])).toBe(false);
        });
        it("OIL_GAS tenant with IUJP present but isMandatoryForPtk007=false -> NOT satisfied", () => {
            expect((0, contractor_lifecycle_1.isPtk007ComplianceSatisfied)(true, [
                { category: "IUJP", isMandatoryForPtk007: false },
                { category: "CSMS_CERTIFICATE", isMandatoryForPtk007: true },
            ])).toBe(false);
        });
        it("OIL_GAS tenant with zero docs -> NOT satisfied", () => {
            expect((0, contractor_lifecycle_1.isPtk007ComplianceSatisfied)(true, [])).toBe(false);
        });
    });
    describe("areMandatoryDocumentsVerified (BR-05)", () => {
        it("all mandatory docs VERIFIED -> true", () => {
            expect((0, contractor_lifecycle_1.areMandatoryDocumentsVerified)([
                { isMandatory: true, status: "VERIFIED" },
                { isMandatory: true, status: "VERIFIED" },
            ])).toBe(true);
        });
        it("one mandatory doc NOT VERIFIED -> false", () => {
            expect((0, contractor_lifecycle_1.areMandatoryDocumentsVerified)([
                { isMandatory: true, status: "VERIFIED" },
                { isMandatory: true, status: "PENDING" },
            ])).toBe(false);
        });
        it("non-mandatory doc unverified doesn't block", () => {
            expect((0, contractor_lifecycle_1.areMandatoryDocumentsVerified)([
                { isMandatory: true, status: "VERIFIED" },
                { isMandatory: false, status: "PENDING" },
            ])).toBe(true);
        });
        it("empty document list -> vacuously true", () => {
            expect((0, contractor_lifecycle_1.areMandatoryDocumentsVerified)([])).toBe(true);
        });
    });
    describe("isBlacklistTransition (BR-06)", () => {
        it("BLACKLISTED -> true", () => {
            expect((0, contractor_lifecycle_1.isBlacklistTransition)("BLACKLISTED")).toBe(true);
        });
        it("SUSPENDED -> false", () => {
            expect((0, contractor_lifecycle_1.isBlacklistTransition)("SUSPENDED")).toBe(false);
        });
        it("ACTIVE -> false", () => {
            expect((0, contractor_lifecycle_1.isBlacklistTransition)("ACTIVE")).toBe(false);
        });
    });
    describe("isConsecutiveUnacceptable (BR-07)", () => {
        it("current UNACCEPTABLE + previous UNACCEPTABLE -> true", () => {
            expect((0, contractor_lifecycle_1.isConsecutiveUnacceptable)("UNACCEPTABLE", "UNACCEPTABLE")).toBe(true);
        });
        it("current UNACCEPTABLE + previous POOR -> false", () => {
            expect((0, contractor_lifecycle_1.isConsecutiveUnacceptable)("UNACCEPTABLE", "POOR")).toBe(false);
        });
        it("current UNACCEPTABLE + no previous evaluation -> false", () => {
            expect((0, contractor_lifecycle_1.isConsecutiveUnacceptable)("UNACCEPTABLE", null)).toBe(false);
        });
        it("current GOOD + previous UNACCEPTABLE -> false", () => {
            expect((0, contractor_lifecycle_1.isConsecutiveUnacceptable)("GOOD", "UNACCEPTABLE")).toBe(false);
        });
    });
    describe("isWithinComplianceReminderWindow", () => {
        const now = new Date("2026-06-01T00:00:00Z");
        it("expiry 10 days out, reminder window 30 -> within window", () => {
            expect((0, contractor_lifecycle_1.isWithinComplianceReminderWindow)(new Date("2026-06-11T00:00:00Z"), now, 30)).toBe(true);
        });
        it("expiry 40 days out, reminder window 30 -> NOT within window", () => {
            expect((0, contractor_lifecycle_1.isWithinComplianceReminderWindow)(new Date("2026-07-11T00:00:00Z"), now, 30)).toBe(false);
        });
        it("expiry already passed -> NOT within window (handled by isComplianceExpired instead)", () => {
            expect((0, contractor_lifecycle_1.isWithinComplianceReminderWindow)(new Date("2026-05-01T00:00:00Z"), now, 30)).toBe(false);
        });
        it("expiry exactly at window boundary -> within window (inclusive)", () => {
            expect((0, contractor_lifecycle_1.isWithinComplianceReminderWindow)(new Date("2026-07-01T00:00:00Z"), now, 30)).toBe(true);
        });
    });
    describe("isComplianceExpired", () => {
        const now = new Date("2026-06-01T00:00:00Z");
        it("expiry in the past -> expired", () => {
            expect((0, contractor_lifecycle_1.isComplianceExpired)(new Date("2026-05-01T00:00:00Z"), now)).toBe(true);
        });
        it("expiry in the future -> not expired", () => {
            expect((0, contractor_lifecycle_1.isComplianceExpired)(new Date("2026-07-01T00:00:00Z"), now)).toBe(false);
        });
    });
    describe("calculateDaysUntilExpiry", () => {
        it("computes whole-day difference", () => {
            expect((0, contractor_lifecycle_1.calculateDaysUntilExpiry)(new Date("2026-06-11T00:00:00Z"), new Date("2026-06-01T00:00:00Z"))).toBe(10);
        });
        it("negative for already-expired dates", () => {
            expect((0, contractor_lifecycle_1.calculateDaysUntilExpiry)(new Date("2026-05-25T00:00:00Z"), new Date("2026-06-01T00:00:00Z"))).toBe(-7);
        });
    });
});
