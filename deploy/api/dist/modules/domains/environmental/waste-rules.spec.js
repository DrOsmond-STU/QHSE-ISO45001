"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const waste_rules_1 = require("./waste-rules");
describe("assertWasteCodeRequiredForHazardous (BR-08)", () => {
    it("HAZARDOUS_B3 tanpa waste_code ditolak", () => {
        expect(() => (0, waste_rules_1.assertWasteCodeRequiredForHazardous)("HAZARDOUS_B3", null)).toThrow(/BR-08/);
    });
    it("HAZARDOUS_B3 dgn waste_code lolos", () => {
        expect(() => (0, waste_rules_1.assertWasteCodeRequiredForHazardous)("HAZARDOUS_B3", "A102d")).not.toThrow();
    });
    it("NON_HAZARDOUS tanpa waste_code lolos (tidak wajib)", () => {
        expect(() => (0, waste_rules_1.assertWasteCodeRequiredForHazardous)("NON_HAZARDOUS", null)).not.toThrow();
    });
});
describe("isStorageDurationWarningDue / isStorageDurationExceeded (BR-03)", () => {
    const storageStart = new Date("2026-01-01T00:00:00Z");
    const maxDays = 90;
    it("belum masuk window H-7, warning belum due", () => {
        const now = new Date("2026-03-01T00:00:00Z"); // jauh sebelum due date (2026-04-01)
        expect((0, waste_rules_1.isStorageDurationWarningDue)(storageStart, maxDays, now)).toBe(false);
    });
    it("tepat di window H-7, warning due", () => {
        const now = new Date("2026-03-26T00:00:00Z"); // due date 2026-04-01, H-7 = 2026-03-25
        expect((0, waste_rules_1.isStorageDurationWarningDue)(storageStart, maxDays, now)).toBe(true);
    });
    it("sudah lewat due date, warning window sudah lewat juga (bukan lagi 'due', sudah 'exceeded')", () => {
        const now = new Date("2026-04-02T00:00:00Z");
        expect((0, waste_rules_1.isStorageDurationWarningDue)(storageStart, maxDays, now)).toBe(false);
        expect((0, waste_rules_1.isStorageDurationExceeded)(storageStart, maxDays, now)).toBe(true);
    });
    it("belum exceeded sebelum due date", () => {
        const now = new Date("2026-03-31T00:00:00Z");
        expect((0, waste_rules_1.isStorageDurationExceeded)(storageStart, maxDays, now)).toBe(false);
    });
});
describe("validateManifestStatusTransition", () => {
    it("siklus penuh DRAFT->ISSUED->IN_TRANSIT->RECEIVED_BY_TRANSPORTER->RECEIVED_BY_PROCESSOR->COMPLETED valid", () => {
        expect(() => (0, waste_rules_1.validateManifestStatusTransition)("DRAFT", "ISSUED")).not.toThrow();
        expect(() => (0, waste_rules_1.validateManifestStatusTransition)("ISSUED", "IN_TRANSIT")).not.toThrow();
        expect(() => (0, waste_rules_1.validateManifestStatusTransition)("IN_TRANSIT", "RECEIVED_BY_TRANSPORTER")).not.toThrow();
        expect(() => (0, waste_rules_1.validateManifestStatusTransition)("RECEIVED_BY_TRANSPORTER", "RECEIVED_BY_PROCESSOR")).not.toThrow();
        expect(() => (0, waste_rules_1.validateManifestStatusTransition)("RECEIVED_BY_PROCESSOR", "COMPLETED")).not.toThrow();
    });
    it("REJECTED dapat terjadi dari status in-progress mana pun", () => {
        expect(() => (0, waste_rules_1.validateManifestStatusTransition)("ISSUED", "REJECTED")).not.toThrow();
        expect(() => (0, waste_rules_1.validateManifestStatusTransition)("IN_TRANSIT", "REJECTED")).not.toThrow();
        expect(() => (0, waste_rules_1.validateManifestStatusTransition)("RECEIVED_BY_PROCESSOR", "REJECTED")).not.toThrow();
    });
    it("COMPLETED/REJECTED bersifat terminal", () => {
        expect(() => (0, waste_rules_1.validateManifestStatusTransition)("COMPLETED", "ISSUED")).toThrow(/tidak valid/);
        expect(() => (0, waste_rules_1.validateManifestStatusTransition)("REJECTED", "ISSUED")).toThrow(/tidak valid/);
    });
    it("melompati tahap ditolak", () => {
        expect(() => (0, waste_rules_1.validateManifestStatusTransition)("DRAFT", "COMPLETED")).toThrow(/tidak valid/);
    });
});
//# sourceMappingURL=waste-rules.spec.js.map