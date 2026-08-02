"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const review_schedule_scan_1 = require("./review-schedule-scan");
const NOW = new Date("2026-07-25T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
function candidate(overrides) {
    return {
        reviewScheduleId: "rs-1",
        scheduledReviewDate: NOW,
        actualReviewDate: null,
        reviewReminderSentAt: null,
        ...overrides,
    };
}
describe("findReviewsDueForReminder (PRD §4.3 H-30)", () => {
    it("scheduledReviewDate persis 30 hari lagi -> due", () => {
        const c = candidate({ scheduledReviewDate: new Date(NOW.getTime() + 30 * DAY) });
        expect((0, review_schedule_scan_1.findReviewsDueForReminder)([c], NOW)).toEqual([c]);
    });
    it("scheduledReviewDate 10 hari lagi (sudah masuk jendela <=30) -> due — job yg absen tepat H-30 tetap mengejar", () => {
        const c = candidate({ scheduledReviewDate: new Date(NOW.getTime() + 10 * DAY) });
        expect((0, review_schedule_scan_1.findReviewsDueForReminder)([c], NOW)).toEqual([c]);
    });
    it("scheduledReviewDate 45 hari lagi (belum masuk jendela) -> belum due", () => {
        const c = candidate({ scheduledReviewDate: new Date(NOW.getTime() + 45 * DAY) });
        expect((0, review_schedule_scan_1.findReviewsDueForReminder)([c], NOW)).toEqual([]);
    });
    it("reviewReminderSentAt sudah terisi -> PERMANEN dikecualikan walau masih dalam jendela (idempotency)", () => {
        const c = candidate({ scheduledReviewDate: new Date(NOW.getTime() + 5 * DAY), reviewReminderSentAt: new Date() });
        expect((0, review_schedule_scan_1.findReviewsDueForReminder)([c], NOW)).toEqual([]);
    });
    it("actualReviewDate sudah terisi (review sudah selesai) -> tidak butuh reminder lagi", () => {
        const c = candidate({ scheduledReviewDate: new Date(NOW.getTime() + 5 * DAY), actualReviewDate: NOW });
        expect((0, review_schedule_scan_1.findReviewsDueForReminder)([c], NOW)).toEqual([]);
    });
});
describe("findOverdueReviewSchedules (BR-06)", () => {
    it("scheduledReviewDate sudah lewat tanpa actualReviewDate -> overdue", () => {
        const c = candidate({ scheduledReviewDate: new Date(NOW.getTime() - 1 * DAY) });
        expect((0, review_schedule_scan_1.findOverdueReviewSchedules)([c], NOW)).toEqual([c]);
    });
    it("scheduledReviewDate masih di masa depan -> belum overdue", () => {
        const c = candidate({ scheduledReviewDate: new Date(NOW.getTime() + 1 * DAY) });
        expect((0, review_schedule_scan_1.findOverdueReviewSchedules)([c], NOW)).toEqual([]);
    });
    it("actualReviewDate sudah terisi -> tidak pernah overdue walau scheduledReviewDate lewat", () => {
        const c = candidate({ scheduledReviewDate: new Date(NOW.getTime() - 5 * DAY), actualReviewDate: NOW });
        expect((0, review_schedule_scan_1.findOverdueReviewSchedules)([c], NOW)).toEqual([]);
    });
});
//# sourceMappingURL=review-schedule-scan.spec.js.map