"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inspection_rules_1 = require("./inspection-rules");
describe("validateInspectionStatusTransition", () => {
    it("mengizinkan alur penuh DRAFT->SUBMITTED->REVIEWED->CLOSED", () => {
        expect(() => (0, inspection_rules_1.validateInspectionStatusTransition)("DRAFT", "SUBMITTED")).not.toThrow();
        expect(() => (0, inspection_rules_1.validateInspectionStatusTransition)("SUBMITTED", "REVIEWED")).not.toThrow();
        expect(() => (0, inspection_rules_1.validateInspectionStatusTransition)("REVIEWED", "CLOSED")).not.toThrow();
    });
    it("menolak lompat DRAFT langsung ke CLOSED", () => {
        expect(() => (0, inspection_rules_1.validateInspectionStatusTransition)("DRAFT", "CLOSED")).toThrow(/tidak valid/);
    });
});
describe("shouldAutoCreateNcr (BR-03)", () => {
    it("TRUE utk FAIL pada FINAL", () => {
        expect((0, inspection_rules_1.shouldAutoCreateNcr)("FAIL", "FINAL")).toBe(true);
    });
    it("TRUE utk FAIL pada PRE_SHIPMENT", () => {
        expect((0, inspection_rules_1.shouldAutoCreateNcr)("FAIL", "PRE_SHIPMENT")).toBe(true);
    });
    it("FALSE utk FAIL pada INCOMING/IN_PROCESS", () => {
        expect((0, inspection_rules_1.shouldAutoCreateNcr)("FAIL", "INCOMING")).toBe(false);
        expect((0, inspection_rules_1.shouldAutoCreateNcr)("FAIL", "IN_PROCESS")).toBe(false);
    });
    it("FALSE utk PASS/CONDITIONAL_PASS pada FINAL", () => {
        expect((0, inspection_rules_1.shouldAutoCreateNcr)("PASS", "FINAL")).toBe(false);
        expect((0, inspection_rules_1.shouldAutoCreateNcr)("CONDITIONAL_PASS", "FINAL")).toBe(false);
    });
});
describe("assertDeviationApprovedBeforeClose (BR-08)", () => {
    it("menolak CLOSED USE_AS_IS_DEVIATION belum approved", () => {
        expect(() => (0, inspection_rules_1.assertDeviationApprovedBeforeClose)("USE_AS_IS_DEVIATION", false)).toThrow(/BR-08/);
    });
    it("mengizinkan CLOSED USE_AS_IS_DEVIATION sudah approved", () => {
        expect(() => (0, inspection_rules_1.assertDeviationApprovedBeforeClose)("USE_AS_IS_DEVIATION", true)).not.toThrow();
    });
    it("mengizinkan CLOSED disposisi lain tanpa approval", () => {
        expect(() => (0, inspection_rules_1.assertDeviationApprovedBeforeClose)("ACCEPT", false)).not.toThrow();
        expect(() => (0, inspection_rules_1.assertDeviationApprovedBeforeClose)(null, false)).not.toThrow();
    });
});
//# sourceMappingURL=inspection-rules.spec.js.map