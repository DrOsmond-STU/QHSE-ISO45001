"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const work_permit_extension_rules_1 = require("./work-permit-extension-rules");
describe("assertExtensionRequestAllowed — BR-07", () => {
    const plannedEnd = new Date("2026-08-01T18:00:00Z");
    it("tidak melempar kalau sebelum planned_end_datetime dan di bawah batas maksimum", () => {
        expect(() => (0, work_permit_extension_rules_1.assertExtensionRequestAllowed)(new Date("2026-08-01T12:00:00Z"), plannedEnd, 0, 1)).not.toThrow();
    });
    it("melempar kalau sudah melewati planned_end_datetime", () => {
        expect(() => (0, work_permit_extension_rules_1.assertExtensionRequestAllowed)(new Date("2026-08-01T19:00:00Z"), plannedEnd, 0, 1)).toThrow();
    });
    it("melempar kalau tepat di planned_end_datetime (batas eksklusif)", () => {
        expect(() => (0, work_permit_extension_rules_1.assertExtensionRequestAllowed)(plannedEnd, plannedEnd, 0, 1)).toThrow();
    });
    it("melempar kalau existingExtensionCount sudah mencapai maxExtensionCount", () => {
        expect(() => (0, work_permit_extension_rules_1.assertExtensionRequestAllowed)(new Date("2026-08-01T12:00:00Z"), plannedEnd, 1, 1)).toThrow();
        expect(() => (0, work_permit_extension_rules_1.assertExtensionRequestAllowed)(new Date("2026-08-01T12:00:00Z"), plannedEnd, 3, 2)).toThrow();
    });
    it("tidak melempar kalau existingExtensionCount masih di bawah maxExtensionCount", () => {
        expect(() => (0, work_permit_extension_rules_1.assertExtensionRequestAllowed)(new Date("2026-08-01T12:00:00Z"), plannedEnd, 1, 2)).not.toThrow();
    });
});
