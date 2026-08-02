"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hira_review_due_scan_1 = require("./hira-review-due-scan");
const NOW = new Date("2026-07-25T00:00:00.000Z");
function candidate(overrides) {
    return { hiraId: "hira-1", reviewDueDate: null, status: "ACTIVE", reviewReminderSentAt: null, ...overrides };
}
function daysFromNow(days) {
    return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}
describe("findHiraAssessmentsDueForReviewReminder", () => {
    it("includes ACTIVE HIRA within the 30-day window", () => {
        const c = candidate({ reviewDueDate: daysFromNow(20) });
        expect((0, hira_review_due_scan_1.findHiraAssessmentsDueForReviewReminder)([c], NOW)).toEqual([c]);
    });
    it("excludes HIRA outside the 30-day window", () => {
        const c = candidate({ reviewDueDate: daysFromNow(45) });
        expect((0, hira_review_due_scan_1.findHiraAssessmentsDueForReviewReminder)([c], NOW)).toEqual([]);
    });
    it.each(["DRAFT", "IN_REVIEW", "APPROVED", "REQUIRES_REVISION", "ARCHIVED"])("excludes HIRA with status %s", (status) => {
        const c = candidate({ status, reviewDueDate: daysFromNow(10) });
        expect((0, hira_review_due_scan_1.findHiraAssessmentsDueForReviewReminder)([c], NOW)).toEqual([]);
    });
    it("excludes HIRA already reminded", () => {
        const c = candidate({ reviewDueDate: daysFromNow(10), reviewReminderSentAt: daysFromNow(-5) });
        expect((0, hira_review_due_scan_1.findHiraAssessmentsDueForReviewReminder)([c], NOW)).toEqual([]);
    });
    it("excludes HIRA with null review_due_date", () => {
        const c = candidate({ reviewDueDate: null });
        expect((0, hira_review_due_scan_1.findHiraAssessmentsDueForReviewReminder)([c], NOW)).toEqual([]);
    });
    it("still includes HIRA already past due but not yet reminded (catch-up)", () => {
        const c = candidate({ reviewDueDate: daysFromNow(-3) });
        expect((0, hira_review_due_scan_1.findHiraAssessmentsDueForReviewReminder)([c], NOW)).toEqual([c]);
    });
});
