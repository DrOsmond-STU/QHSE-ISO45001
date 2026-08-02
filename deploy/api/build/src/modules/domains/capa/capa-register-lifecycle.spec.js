"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const capa_register_lifecycle_1 = require("./capa-register-lifecycle");
describe("validateCapaRegisterStatusTransition", () => {
    it("mengizinkan jalur linear penuh DRAFT->...->PENDING_EFFECTIVENESS_VERIFICATION", () => {
        expect(() => (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)("DRAFT", "ROOT_CAUSE_ANALYSIS")).not.toThrow();
        expect(() => (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)("ROOT_CAUSE_ANALYSIS", "ACTION_PLAN_DEFINED")).not.toThrow();
        expect(() => (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)("ACTION_PLAN_DEFINED", "PENDING_APPROVAL")).not.toThrow();
        expect(() => (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)("PENDING_APPROVAL", "IN_PROGRESS")).not.toThrow();
        expect(() => (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)("IN_PROGRESS", "PENDING_EFFECTIVENESS_VERIFICATION")).not.toThrow();
    });
    it("mengizinkan PENDING_APPROVAL->ACTION_PLAN_DEFINED (reject path)", () => {
        expect(() => (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)("PENDING_APPROVAL", "ACTION_PLAN_DEFINED")).not.toThrow();
    });
    it("mengizinkan PENDING_EFFECTIVENESS_VERIFICATION->EFFECTIVE_CLOSED dan ->NOT_EFFECTIVE_REOPENED", () => {
        expect(() => (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)("PENDING_EFFECTIVENESS_VERIFICATION", "EFFECTIVE_CLOSED")).not.toThrow();
        expect(() => (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)("PENDING_EFFECTIVENESS_VERIFICATION", "NOT_EFFECTIVE_REOPENED")).not.toThrow();
    });
    it("BR-04 — NOT_EFFECTIVE_REOPENED HANYA bisa ke ROOT_CAUSE_ANALYSIS (tidak bisa lompat ke ACTION_PLAN_DEFINED)", () => {
        expect(() => (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)("NOT_EFFECTIVE_REOPENED", "ROOT_CAUSE_ANALYSIS")).not.toThrow();
        expect(() => (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)("NOT_EFFECTIVE_REOPENED", "ACTION_PLAN_DEFINED")).toThrow(/tidak valid/);
    });
    it("mengizinkan reopen manual EFFECTIVE_CLOSED->NOT_EFFECTIVE_REOPENED", () => {
        expect(() => (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)("EFFECTIVE_CLOSED", "NOT_EFFECTIVE_REOPENED")).not.toThrow();
    });
    it("menolak transisi dari status terminal CANCELLED", () => {
        expect(() => (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)("CANCELLED", "DRAFT")).toThrow(/tidak valid/);
    });
    it("menolak lompat DRAFT->PENDING_APPROVAL", () => {
        expect(() => (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)("DRAFT", "PENDING_APPROVAL")).toThrow(/tidak valid/);
    });
});
describe("resolveEffectivenessOutcome (BR-01/BR-04)", () => {
    it("EFFECTIVE -> EFFECTIVE_CLOSED", () => {
        expect((0, capa_register_lifecycle_1.resolveEffectivenessOutcome)("EFFECTIVE")).toBe("EFFECTIVE_CLOSED");
    });
    it("NOT_EFFECTIVE -> NOT_EFFECTIVE_REOPENED", () => {
        expect((0, capa_register_lifecycle_1.resolveEffectivenessOutcome)("NOT_EFFECTIVE")).toBe("NOT_EFFECTIVE_REOPENED");
    });
    it("throw kalau result masih PENDING", () => {
        expect(() => (0, capa_register_lifecycle_1.resolveEffectivenessOutcome)("PENDING")).toThrow(/BR-01/);
    });
});
