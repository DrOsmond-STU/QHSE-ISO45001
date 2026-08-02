"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pak_case_lifecycle_1 = require("./pak-case-lifecycle");
describe("validatePakCaseStatusTransition", () => {
    it("OPEN->UNDER_TREATMENT valid", () => {
        expect(() => (0, pak_case_lifecycle_1.validatePakCaseStatusTransition)("OPEN", "UNDER_TREATMENT")).not.toThrow();
    });
    it("OPEN->CLOSED valid (bisa langsung tutup tanpa treatment)", () => {
        expect(() => (0, pak_case_lifecycle_1.validatePakCaseStatusTransition)("OPEN", "CLOSED")).not.toThrow();
    });
    it("OPEN->DECEASED valid", () => {
        expect(() => (0, pak_case_lifecycle_1.validatePakCaseStatusTransition)("OPEN", "DECEASED")).not.toThrow();
    });
    it("RECOVERED->CLOSED valid", () => {
        expect(() => (0, pak_case_lifecycle_1.validatePakCaseStatusTransition)("RECOVERED", "CLOSED")).not.toThrow();
    });
    it("RECOVERED->UNDER_TREATMENT ditolak (tidak mundur)", () => {
        expect(() => (0, pak_case_lifecycle_1.validatePakCaseStatusTransition)("RECOVERED", "UNDER_TREATMENT")).toThrow(/tidak valid/);
    });
    it("CLOSED->apa pun ditolak (status terminal)", () => {
        expect(() => (0, pak_case_lifecycle_1.validatePakCaseStatusTransition)("CLOSED", "OPEN")).toThrow(/tidak valid/);
    });
    it("DECEASED->apa pun ditolak (status terminal)", () => {
        expect(() => (0, pak_case_lifecycle_1.validatePakCaseStatusTransition)("DECEASED", "CLOSED")).toThrow(/tidak valid/);
    });
});
describe("requiresTopManagementEscalation (BR-08)", () => {
    it("true untuk SEVERE/PERMANENT_DISABILITY/FATAL", () => {
        expect((0, pak_case_lifecycle_1.requiresTopManagementEscalation)("SEVERE")).toBe(true);
        expect((0, pak_case_lifecycle_1.requiresTopManagementEscalation)("PERMANENT_DISABILITY")).toBe(true);
        expect((0, pak_case_lifecycle_1.requiresTopManagementEscalation)("FATAL")).toBe(true);
    });
    it("false untuk MILD/MODERATE", () => {
        expect((0, pak_case_lifecycle_1.requiresTopManagementEscalation)("MILD")).toBe(false);
        expect((0, pak_case_lifecycle_1.requiresTopManagementEscalation)("MODERATE")).toBe(false);
    });
});
describe("requiresDisnakerReporting", () => {
    it("true untuk CONFIRMED_WORK_RELATED", () => {
        expect((0, pak_case_lifecycle_1.requiresDisnakerReporting)("CONFIRMED_WORK_RELATED")).toBe(true);
    });
    it("false untuk SUSPECTED/NOT_WORK_RELATED/UNDER_INVESTIGATION", () => {
        expect((0, pak_case_lifecycle_1.requiresDisnakerReporting)("SUSPECTED")).toBe(false);
        expect((0, pak_case_lifecycle_1.requiresDisnakerReporting)("NOT_WORK_RELATED")).toBe(false);
        expect((0, pak_case_lifecycle_1.requiresDisnakerReporting)("UNDER_INVESTIGATION")).toBe(false);
    });
});
//# sourceMappingURL=pak-case-lifecycle.spec.js.map