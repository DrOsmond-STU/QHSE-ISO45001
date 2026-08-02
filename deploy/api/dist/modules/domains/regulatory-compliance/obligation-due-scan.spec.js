"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obligation_due_scan_1 = require("./obligation-due-scan");
const NOW = new Date("2026-07-25T00:00:00.000Z");
function candidate(overrides) {
    return {
        obligationId: "obl-1",
        nextDueDate: null,
        status: "ACTIVE",
        dueReminderSentAt: null,
        overdueNotifiedAt: null,
        ...overrides,
    };
}
function daysFromNow(days) {
    return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}
describe("findObligationsDueForReminder", () => {
    it("includes ACTIVE obligation within 30-day window", () => {
        const c = candidate({ nextDueDate: daysFromNow(20) });
        expect((0, obligation_due_scan_1.findObligationsDueForReminder)([c], NOW)).toEqual([c]);
    });
    it("includes at exact 30-day boundary", () => {
        const c = candidate({ nextDueDate: daysFromNow(30) });
        expect((0, obligation_due_scan_1.findObligationsDueForReminder)([c], NOW)).toEqual([c]);
    });
    it("excludes obligation outside the 30-day window", () => {
        const c = candidate({ nextDueDate: daysFromNow(45) });
        expect((0, obligation_due_scan_1.findObligationsDueForReminder)([c], NOW)).toEqual([]);
    });
    it("excludes obligation already reminded", () => {
        const c = candidate({ nextDueDate: daysFromNow(10), dueReminderSentAt: daysFromNow(-5) });
        expect((0, obligation_due_scan_1.findObligationsDueForReminder)([c], NOW)).toEqual([]);
    });
    it.each(["INACTIVE", "RETIRED"])("excludes obligation with status %s", (status) => {
        const c = candidate({ status, nextDueDate: daysFromNow(10) });
        expect((0, obligation_due_scan_1.findObligationsDueForReminder)([c], NOW)).toEqual([]);
    });
    it("excludes obligation with null next_due_date", () => {
        const c = candidate({ nextDueDate: null });
        expect((0, obligation_due_scan_1.findObligationsDueForReminder)([c], NOW)).toEqual([]);
    });
    it("still includes obligation already past due but not yet reminded (catch-up)", () => {
        const c = candidate({ nextDueDate: daysFromNow(-3) });
        expect((0, obligation_due_scan_1.findObligationsDueForReminder)([c], NOW)).toEqual([c]);
    });
});
describe("findOverdueObligations", () => {
    it("includes ACTIVE obligation past next_due_date", () => {
        const c = candidate({ nextDueDate: daysFromNow(-1) });
        expect((0, obligation_due_scan_1.findOverdueObligations)([c], NOW)).toEqual([c]);
    });
    it("excludes obligation due exactly today (not yet past)", () => {
        const c = candidate({ nextDueDate: NOW });
        expect((0, obligation_due_scan_1.findOverdueObligations)([c], NOW)).toEqual([]);
    });
    it("excludes obligation not yet due", () => {
        const c = candidate({ nextDueDate: daysFromNow(5) });
        expect((0, obligation_due_scan_1.findOverdueObligations)([c], NOW)).toEqual([]);
    });
    it("excludes obligation already notified overdue", () => {
        const c = candidate({ nextDueDate: daysFromNow(-10), overdueNotifiedAt: daysFromNow(-2) });
        expect((0, obligation_due_scan_1.findOverdueObligations)([c], NOW)).toEqual([]);
    });
    it.each(["INACTIVE", "RETIRED"])("excludes obligation with status %s", (status) => {
        const c = candidate({ status, nextDueDate: daysFromNow(-10) });
        expect((0, obligation_due_scan_1.findOverdueObligations)([c], NOW)).toEqual([]);
    });
    it("excludes obligation with null next_due_date", () => {
        const c = candidate({ nextDueDate: null });
        expect((0, obligation_due_scan_1.findOverdueObligations)([c], NOW)).toEqual([]);
    });
});
//# sourceMappingURL=obligation-due-scan.spec.js.map