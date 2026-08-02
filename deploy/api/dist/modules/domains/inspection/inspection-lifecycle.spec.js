"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inspection_lifecycle_1 = require("./inspection-lifecycle");
describe("validateInspectionRecordStatusTransition", () => {
    it("mengizinkan SCHEDULED->IN_PROGRESS->COMPLETED", () => {
        expect(() => (0, inspection_lifecycle_1.validateInspectionRecordStatusTransition)("SCHEDULED", "IN_PROGRESS")).not.toThrow();
        expect(() => (0, inspection_lifecycle_1.validateInspectionRecordStatusTransition)("IN_PROGRESS", "COMPLETED")).not.toThrow();
    });
    it("mengizinkan SCHEDULED/IN_PROGRESS->OVERDUE, lalu OVERDUE->IN_PROGRESS/COMPLETED", () => {
        expect(() => (0, inspection_lifecycle_1.validateInspectionRecordStatusTransition)("SCHEDULED", "OVERDUE")).not.toThrow();
        expect(() => (0, inspection_lifecycle_1.validateInspectionRecordStatusTransition)("IN_PROGRESS", "OVERDUE")).not.toThrow();
        expect(() => (0, inspection_lifecycle_1.validateInspectionRecordStatusTransition)("OVERDUE", "IN_PROGRESS")).not.toThrow();
        expect(() => (0, inspection_lifecycle_1.validateInspectionRecordStatusTransition)("OVERDUE", "COMPLETED")).not.toThrow();
    });
    it("mengizinkan COMPLETED->IN_PROGRESS (BR-03 reopen HSE Manager)", () => {
        expect(() => (0, inspection_lifecycle_1.validateInspectionRecordStatusTransition)("COMPLETED", "IN_PROGRESS")).not.toThrow();
    });
    it("menolak COMPLETED->COMPLETED dan transisi dari CANCELLED (terminal)", () => {
        expect(() => (0, inspection_lifecycle_1.validateInspectionRecordStatusTransition)("COMPLETED", "COMPLETED")).toThrow();
        expect(() => (0, inspection_lifecycle_1.validateInspectionRecordStatusTransition)("CANCELLED", "IN_PROGRESS")).toThrow();
    });
});
//# sourceMappingURL=inspection-lifecycle.spec.js.map