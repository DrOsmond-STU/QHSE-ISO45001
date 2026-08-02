"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const work_permit_lifecycle_1 = require("./work-permit-lifecycle");
describe("validateWorkPermitStatusTransition", () => {
    it("mengizinkan DRAFT -> PENDING_ISSUER_APPROVAL (submit)", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("DRAFT", "PENDING_ISSUER_APPROVAL")).not.toThrow();
    });
    it("mengizinkan DRAFT -> CANCELLED", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("DRAFT", "CANCELLED")).not.toThrow();
    });
    it("mengizinkan PENDING_ISSUER_APPROVAL -> PENDING_HSE_APPROVAL (kondisional BR-04)", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("PENDING_ISSUER_APPROVAL", "PENDING_HSE_APPROVAL")).not.toThrow();
    });
    it("mengizinkan PENDING_ISSUER_APPROVAL -> APPROVED (tanpa HSE stage)", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("PENDING_ISSUER_APPROVAL", "APPROVED")).not.toThrow();
    });
    it("mengizinkan PENDING_HSE_APPROVAL -> APPROVED", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("PENDING_HSE_APPROVAL", "APPROVED")).not.toThrow();
    });
    it("mengizinkan PENDING_ISSUER_APPROVAL/PENDING_HSE_APPROVAL -> REJECTED", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("PENDING_ISSUER_APPROVAL", "REJECTED")).not.toThrow();
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("PENDING_HSE_APPROVAL", "REJECTED")).not.toThrow();
    });
    it("mengizinkan APPROVED -> ACTIVE", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("APPROVED", "ACTIVE")).not.toThrow();
    });
    it("mengizinkan CANCELLED dari DRAFT/PENDING_ISSUER_APPROVAL/PENDING_HSE_APPROVAL/APPROVED", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("PENDING_ISSUER_APPROVAL", "CANCELLED")).not.toThrow();
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("PENDING_HSE_APPROVAL", "CANCELLED")).not.toThrow();
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("APPROVED", "CANCELLED")).not.toThrow();
    });
    it("mengizinkan ACTIVE -> EXTENSION_REQUESTED/PENDING_CLOSURE/SUSPENDED/EXPIRED (task 3.4)", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("ACTIVE", "EXTENSION_REQUESTED")).not.toThrow();
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("ACTIVE", "PENDING_CLOSURE")).not.toThrow();
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("ACTIVE", "SUSPENDED")).not.toThrow();
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("ACTIVE", "EXPIRED")).not.toThrow();
    });
    it("menolak ACTIVE -> CLOSED langsung (wajib lewat PENDING_CLOSURE)", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("ACTIVE", "CLOSED")).toThrow();
    });
    it("mengizinkan EXTENSION_REQUESTED -> ACTIVE (extension APPROVED maupun REJECTED sama-sama kembali ACTIVE)", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("EXTENSION_REQUESTED", "ACTIVE")).not.toThrow();
    });
    it("mengizinkan PENDING_CLOSURE -> CLOSED (closure VERIFIED) dan -> ACTIVE (closure RETURNED)", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("PENDING_CLOSURE", "CLOSED")).not.toThrow();
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("PENDING_CLOSURE", "ACTIVE")).not.toThrow();
    });
    it("mengizinkan SUSPENDED -> ACTIVE (retest gas baru PASS)", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("SUSPENDED", "ACTIVE")).not.toThrow();
    });
    it("menolak dari CLOSED/EXPIRED (terminal, task 3.4)", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("CLOSED", "PENDING_CLOSURE")).toThrow();
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("EXPIRED", "ACTIVE")).toThrow();
    });
    it("menolak transisi mundur (APPROVED -> DRAFT)", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("APPROVED", "DRAFT")).toThrow();
    });
    it("menolak DRAFT -> APPROVED (lompat stage)", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("DRAFT", "APPROVED")).toThrow();
    });
    it("menolak dari status terminal (REJECTED/CANCELLED/CLOSED)", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("REJECTED", "DRAFT")).toThrow();
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("CANCELLED", "DRAFT")).toThrow();
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("CLOSED", "ACTIVE")).toThrow();
    });
    it("SUBMITTED tidak reachable dari mana pun maupun menuju ke mana pun (gap TDD §26, nilai enum literal tidak dipakai task 3.3)", () => {
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("SUBMITTED", "PENDING_ISSUER_APPROVAL")).toThrow();
        expect(() => (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)("DRAFT", "SUBMITTED")).toThrow();
    });
});
