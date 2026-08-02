"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcu_lifecycle_1 = require("./mcu-lifecycle");
describe("validateMcuScheduleStatusTransition", () => {
    it("SCHEDULED->COMPLETED valid", () => {
        expect(() => (0, mcu_lifecycle_1.validateMcuScheduleStatusTransition)("SCHEDULED", "COMPLETED")).not.toThrow();
    });
    it("SCHEDULED->RESCHEDULED valid", () => {
        expect(() => (0, mcu_lifecycle_1.validateMcuScheduleStatusTransition)("SCHEDULED", "RESCHEDULED")).not.toThrow();
    });
    it("NO_SHOW->RESCHEDULED valid (bisa dijadwal ulang)", () => {
        expect(() => (0, mcu_lifecycle_1.validateMcuScheduleStatusTransition)("NO_SHOW", "RESCHEDULED")).not.toThrow();
    });
    it("NO_SHOW->COMPLETED ditolak (harus dijadwal ulang dulu)", () => {
        expect(() => (0, mcu_lifecycle_1.validateMcuScheduleStatusTransition)("NO_SHOW", "COMPLETED")).toThrow(/tidak valid/);
    });
    it("COMPLETED->apa pun ditolak (status terminal)", () => {
        expect(() => (0, mcu_lifecycle_1.validateMcuScheduleStatusTransition)("COMPLETED", "RESCHEDULED")).toThrow(/tidak valid/);
    });
    it("CANCELLED->apa pun ditolak (status terminal)", () => {
        expect(() => (0, mcu_lifecycle_1.validateMcuScheduleStatusTransition)("CANCELLED", "SCHEDULED")).toThrow(/tidak valid/);
    });
});
describe("validateMcuResultStatusTransition", () => {
    it("DRAFT->FINALIZED valid", () => {
        expect(() => (0, mcu_lifecycle_1.validateMcuResultStatusTransition)("DRAFT", "FINALIZED")).not.toThrow();
    });
    it("FINALIZED->SHARED_WITH_EMPLOYEE valid", () => {
        expect(() => (0, mcu_lifecycle_1.validateMcuResultStatusTransition)("FINALIZED", "SHARED_WITH_EMPLOYEE")).not.toThrow();
    });
    it("DRAFT->SHARED_WITH_EMPLOYEE langsung ditolak", () => {
        expect(() => (0, mcu_lifecycle_1.validateMcuResultStatusTransition)("DRAFT", "SHARED_WITH_EMPLOYEE")).toThrow(/tidak valid/);
    });
});
describe("requiresFitToWorkAssessment", () => {
    it("true untuk MAJOR_FINDING", () => {
        expect((0, mcu_lifecycle_1.requiresFitToWorkAssessment)("MAJOR_FINDING")).toBe(true);
    });
    it("true untuk REQUIRES_FOLLOW_UP", () => {
        expect((0, mcu_lifecycle_1.requiresFitToWorkAssessment)("REQUIRES_FOLLOW_UP")).toBe(true);
    });
    it("false untuk NORMAL/MINOR_FINDING", () => {
        expect((0, mcu_lifecycle_1.requiresFitToWorkAssessment)("NORMAL")).toBe(false);
        expect((0, mcu_lifecycle_1.requiresFitToWorkAssessment)("MINOR_FINDING")).toBe(false);
    });
});
describe("isPreEmploymentClearanceComplete (BR-07)", () => {
    it("true jika schedule COMPLETED, ada hasil, fit_status bukan UNFIT", () => {
        expect((0, mcu_lifecycle_1.isPreEmploymentClearanceComplete)({ mcuScheduleStatus: "COMPLETED", hasMcuResult: true, fitStatus: "FIT" })).toBe(true);
        expect((0, mcu_lifecycle_1.isPreEmploymentClearanceComplete)({ mcuScheduleStatus: "COMPLETED", hasMcuResult: true, fitStatus: "FIT_WITH_RESTRICTION" })).toBe(true);
    });
    it("false jika fit_status UNFIT", () => {
        expect((0, mcu_lifecycle_1.isPreEmploymentClearanceComplete)({ mcuScheduleStatus: "COMPLETED", hasMcuResult: true, fitStatus: "UNFIT" })).toBe(false);
    });
    it("false jika schedule belum COMPLETED", () => {
        expect((0, mcu_lifecycle_1.isPreEmploymentClearanceComplete)({ mcuScheduleStatus: "SCHEDULED", hasMcuResult: false, fitStatus: null })).toBe(false);
    });
    it("false jika belum ada mcu_results", () => {
        expect((0, mcu_lifecycle_1.isPreEmploymentClearanceComplete)({ mcuScheduleStatus: "COMPLETED", hasMcuResult: false, fitStatus: null })).toBe(false);
    });
    it("false jika belum ada fit_to_work_assessments sama sekali", () => {
        expect((0, mcu_lifecycle_1.isPreEmploymentClearanceComplete)({ mcuScheduleStatus: "COMPLETED", hasMcuResult: true, fitStatus: null })).toBe(false);
    });
});
describe("isMcuReminderDue (PRD §8 baris 1)", () => {
    const now = new Date("2026-08-01T00:00:00.000Z");
    it("false kalau reminder sudah pernah dikirim (reminder_sent_at terisi)", () => {
        expect((0, mcu_lifecycle_1.isMcuReminderDue)(new Date("2026-08-05T00:00:00.000Z"), now, new Date("2026-07-20T00:00:00.000Z"))).toBe(false);
    });
    it("true kalau scheduledDate dalam window 14 hari ke depan", () => {
        expect((0, mcu_lifecycle_1.isMcuReminderDue)(new Date("2026-08-10T00:00:00.000Z"), now, null)).toBe(true);
    });
    it("true tepat di batas 14 hari", () => {
        expect((0, mcu_lifecycle_1.isMcuReminderDue)(new Date("2026-08-15T00:00:00.000Z"), now, null)).toBe(true);
    });
    it("false kalau scheduledDate masih lebih dari 14 hari lagi", () => {
        expect((0, mcu_lifecycle_1.isMcuReminderDue)(new Date("2026-08-20T00:00:00.000Z"), now, null)).toBe(false);
    });
    it("false kalau scheduledDate sudah lewat (bukan reminder, sudah terlambat)", () => {
        expect((0, mcu_lifecycle_1.isMcuReminderDue)(new Date("2026-07-25T00:00:00.000Z"), now, null)).toBe(false);
    });
    it("true kalau scheduledDate tepat hari ini (H-0, masih dalam window)", () => {
        expect((0, mcu_lifecycle_1.isMcuReminderDue)(now, now, null)).toBe(true);
    });
});
//# sourceMappingURL=mcu-lifecycle.spec.js.map