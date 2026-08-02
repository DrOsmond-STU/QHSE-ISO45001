"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const complaint_lifecycle_1 = require("./complaint-lifecycle");
describe("validateComplaintStatusTransition", () => {
    it("mengizinkan alur penuh RECEIVED->UNDER_INVESTIGATION->CAPA_IN_PROGRESS->RESOLVED->CLOSED", () => {
        expect(() => (0, complaint_lifecycle_1.validateComplaintStatusTransition)("RECEIVED", "UNDER_INVESTIGATION")).not.toThrow();
        expect(() => (0, complaint_lifecycle_1.validateComplaintStatusTransition)("UNDER_INVESTIGATION", "CAPA_IN_PROGRESS")).not.toThrow();
        expect(() => (0, complaint_lifecycle_1.validateComplaintStatusTransition)("CAPA_IN_PROGRESS", "RESOLVED")).not.toThrow();
        expect(() => (0, complaint_lifecycle_1.validateComplaintStatusTransition)("RESOLVED", "CLOSED")).not.toThrow();
    });
    it("mengizinkan RECEIVED langsung REJECTED_INVALID", () => {
        expect(() => (0, complaint_lifecycle_1.validateComplaintStatusTransition)("RECEIVED", "REJECTED_INVALID")).not.toThrow();
    });
    it("menolak transisi dari status terminal CLOSED/REJECTED_INVALID", () => {
        expect(() => (0, complaint_lifecycle_1.validateComplaintStatusTransition)("CLOSED", "RECEIVED")).toThrow(/tidak valid/);
        expect(() => (0, complaint_lifecycle_1.validateComplaintStatusTransition)("REJECTED_INVALID", "RECEIVED")).toThrow(/tidak valid/);
    });
});
describe("assertCapaRequiredForCategory", () => {
    it("menolak severity HIGH/CRITICAL tanpa capa_id", () => {
        expect(() => (0, complaint_lifecycle_1.assertCapaRequiredForCategory)("HIGH", null)).toThrow();
        expect(() => (0, complaint_lifecycle_1.assertCapaRequiredForCategory)("CRITICAL", null)).toThrow();
    });
    it("mengizinkan severity LOW/MEDIUM tanpa capa_id", () => {
        expect(() => (0, complaint_lifecycle_1.assertCapaRequiredForCategory)("LOW", null)).not.toThrow();
        expect(() => (0, complaint_lifecycle_1.assertCapaRequiredForCategory)("MEDIUM", null)).not.toThrow();
    });
});
describe("isInitialResponseOverdue (BR-02)", () => {
    const due = new Date("2026-07-20T00:00:00.000Z");
    it("TRUE jika due date lewat & belum direspon", () => {
        expect((0, complaint_lifecycle_1.isInitialResponseOverdue)(due, null, new Date("2026-07-21T00:00:00.000Z"))).toBe(true);
    });
    it("FALSE jika sudah direspon (terlepas dari waktu)", () => {
        expect((0, complaint_lifecycle_1.isInitialResponseOverdue)(due, new Date("2026-07-22T00:00:00.000Z"), new Date("2026-07-25T00:00:00.000Z"))).toBe(false);
    });
    it("FALSE jika belum lewat due date", () => {
        expect((0, complaint_lifecycle_1.isInitialResponseOverdue)(due, null, new Date("2026-07-19T00:00:00.000Z"))).toBe(false);
    });
});
