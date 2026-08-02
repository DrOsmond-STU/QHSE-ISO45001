"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fit_to_work_lifecycle_1 = require("./fit-to-work-lifecycle");
describe("validateFitToWorkAssessmentStatusTransition", () => {
    it("ACTIVE->EXPIRED valid", () => {
        expect(() => (0, fit_to_work_lifecycle_1.validateFitToWorkAssessmentStatusTransition)("ACTIVE", "EXPIRED")).not.toThrow();
    });
    it("ACTIVE->SUPERSEDED valid", () => {
        expect(() => (0, fit_to_work_lifecycle_1.validateFitToWorkAssessmentStatusTransition)("ACTIVE", "SUPERSEDED")).not.toThrow();
    });
    it("EXPIRED->apa pun ditolak (status terminal)", () => {
        expect(() => (0, fit_to_work_lifecycle_1.validateFitToWorkAssessmentStatusTransition)("EXPIRED", "ACTIVE")).toThrow(/tidak valid/);
    });
});
describe("requiresRestrictedDutyAssignment", () => {
    it("true untuk FIT_WITH_RESTRICTION", () => {
        expect((0, fit_to_work_lifecycle_1.requiresRestrictedDutyAssignment)("FIT_WITH_RESTRICTION")).toBe(true);
    });
    it("true untuk TEMPORARY_UNFIT", () => {
        expect((0, fit_to_work_lifecycle_1.requiresRestrictedDutyAssignment)("TEMPORARY_UNFIT")).toBe(true);
    });
    it("false untuk FIT (tidak perlu pembatasan)", () => {
        expect((0, fit_to_work_lifecycle_1.requiresRestrictedDutyAssignment)("FIT")).toBe(false);
    });
    it("false untuk UNFIT (tidak bisa bekerja sama sekali, bukan tugas terbatas)", () => {
        expect((0, fit_to_work_lifecycle_1.requiresRestrictedDutyAssignment)("UNFIT")).toBe(false);
    });
});
describe("isReassessmentDue", () => {
    it("false jika next_reassessment_date null", () => {
        expect((0, fit_to_work_lifecycle_1.isReassessmentDue)(null, new Date("2026-08-01"))).toBe(false);
    });
    it("true jika tanggal sudah lewat", () => {
        expect((0, fit_to_work_lifecycle_1.isReassessmentDue)(new Date("2026-07-01"), new Date("2026-08-01"))).toBe(true);
    });
    it("true jika tepat hari ini", () => {
        const d = new Date("2026-08-01");
        expect((0, fit_to_work_lifecycle_1.isReassessmentDue)(d, d)).toBe(true);
    });
    it("false jika masih di masa depan", () => {
        expect((0, fit_to_work_lifecycle_1.isReassessmentDue)(new Date("2026-09-01"), new Date("2026-08-01"))).toBe(false);
    });
});
describe("validateRestrictedDutyAssignmentStatusTransition", () => {
    it("ACTIVE->COMPLETED valid", () => {
        expect(() => (0, fit_to_work_lifecycle_1.validateRestrictedDutyAssignmentStatusTransition)("ACTIVE", "COMPLETED")).not.toThrow();
    });
    it("ACTIVE->ESCALATED_NON_COMPLIANT valid", () => {
        expect(() => (0, fit_to_work_lifecycle_1.validateRestrictedDutyAssignmentStatusTransition)("ACTIVE", "ESCALATED_NON_COMPLIANT")).not.toThrow();
    });
    it("COMPLETED->apa pun ditolak (status terminal)", () => {
        expect(() => (0, fit_to_work_lifecycle_1.validateRestrictedDutyAssignmentStatusTransition)("COMPLETED", "ACTIVE")).toThrow(/tidak valid/);
    });
});
//# sourceMappingURL=fit-to-work-lifecycle.spec.js.map