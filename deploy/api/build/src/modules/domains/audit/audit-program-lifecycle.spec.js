"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const audit_program_lifecycle_1 = require("./audit-program-lifecycle");
describe("validateAuditProgramStatusTransition", () => {
    it("mengizinkan DRAFT->APPROVED", () => {
        expect(() => (0, audit_program_lifecycle_1.validateAuditProgramStatusTransition)("DRAFT", "APPROVED")).not.toThrow();
    });
    it("mengizinkan REJECT path DRAFT->DRAFT (no-op, dipanggil listener)", () => {
        expect(() => (0, audit_program_lifecycle_1.validateAuditProgramStatusTransition)("DRAFT", "CANCELLED")).not.toThrow();
    });
    it("mengizinkan APPROVED->IN_PROGRESS->COMPLETED", () => {
        expect(() => (0, audit_program_lifecycle_1.validateAuditProgramStatusTransition)("APPROVED", "IN_PROGRESS")).not.toThrow();
        expect(() => (0, audit_program_lifecycle_1.validateAuditProgramStatusTransition)("IN_PROGRESS", "COMPLETED")).not.toThrow();
    });
    it("menolak transisi dari status terminal COMPLETED", () => {
        expect(() => (0, audit_program_lifecycle_1.validateAuditProgramStatusTransition)("COMPLETED", "IN_PROGRESS")).toThrow(/tidak valid/);
    });
    it("menolak DRAFT->IN_PROGRESS (lompat approval)", () => {
        expect(() => (0, audit_program_lifecycle_1.validateAuditProgramStatusTransition)("DRAFT", "IN_PROGRESS")).toThrow(/tidak valid/);
    });
});
describe("validateAuditProgramPlanItemStatusTransition", () => {
    it("mengizinkan PLANNED->SCHEDULED->EXECUTED", () => {
        expect(() => (0, audit_program_lifecycle_1.validateAuditProgramPlanItemStatusTransition)("PLANNED", "SCHEDULED")).not.toThrow();
        expect(() => (0, audit_program_lifecycle_1.validateAuditProgramPlanItemStatusTransition)("SCHEDULED", "EXECUTED")).not.toThrow();
    });
    it("mengizinkan PLANNED->EXECUTED langsung (ad-hoc tanpa SCHEDULED)", () => {
        expect(() => (0, audit_program_lifecycle_1.validateAuditProgramPlanItemStatusTransition)("PLANNED", "EXECUTED")).not.toThrow();
    });
    it("menolak transisi dari EXECUTED (terminal)", () => {
        expect(() => (0, audit_program_lifecycle_1.validateAuditProgramPlanItemStatusTransition)("EXECUTED", "CANCELLED")).toThrow(/tidak valid/);
    });
});
describe("assertPlanItemEditable (BR-06)", () => {
    it("tidak throw utk status PLANNED/SCHEDULED/CANCELLED", () => {
        expect(() => (0, audit_program_lifecycle_1.assertPlanItemEditable)("PLANNED")).not.toThrow();
        expect(() => (0, audit_program_lifecycle_1.assertPlanItemEditable)("SCHEDULED")).not.toThrow();
        expect(() => (0, audit_program_lifecycle_1.assertPlanItemEditable)("CANCELLED")).not.toThrow();
    });
    it("throw kalau status EXECUTED", () => {
        expect(() => (0, audit_program_lifecycle_1.assertPlanItemEditable)("EXECUTED")).toThrow(/BR-06/);
    });
});
