"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ncr_lifecycle_1 = require("./ncr-lifecycle");
describe("validateNcrStatusTransition", () => {
    it("mengizinkan alur penuh OPEN->CONTAINMENT->DISPOSITION_PENDING->DISPOSITIONED->CAPA_LINKED->CLOSED", () => {
        expect(() => (0, ncr_lifecycle_1.validateNcrStatusTransition)("OPEN", "CONTAINMENT")).not.toThrow();
        expect(() => (0, ncr_lifecycle_1.validateNcrStatusTransition)("CONTAINMENT", "DISPOSITION_PENDING")).not.toThrow();
        expect(() => (0, ncr_lifecycle_1.validateNcrStatusTransition)("DISPOSITION_PENDING", "DISPOSITIONED")).not.toThrow();
        expect(() => (0, ncr_lifecycle_1.validateNcrStatusTransition)("DISPOSITIONED", "CAPA_LINKED")).not.toThrow();
        expect(() => (0, ncr_lifecycle_1.validateNcrStatusTransition)("CAPA_LINKED", "CLOSED")).not.toThrow();
    });
    it("mengizinkan DISPOSITIONED langsung ke CLOSED (severity MINOR, tanpa CAPA)", () => {
        expect(() => (0, ncr_lifecycle_1.validateNcrStatusTransition)("DISPOSITIONED", "CLOSED")).not.toThrow();
    });
    it("menolak transisi dari status terminal CLOSED", () => {
        expect(() => (0, ncr_lifecycle_1.validateNcrStatusTransition)("CLOSED", "OPEN")).toThrow(/tidak valid/);
    });
    it("menolak lompat OPEN langsung ke DISPOSITIONED", () => {
        expect(() => (0, ncr_lifecycle_1.validateNcrStatusTransition)("OPEN", "DISPOSITIONED")).toThrow(/tidak valid/);
    });
});
describe("assertCapaRequiredBeforeClose (BR-01)", () => {
    it("menolak CLOSED severity MAJOR tanpa capa_id", () => {
        expect(() => (0, ncr_lifecycle_1.assertCapaRequiredBeforeClose)("MAJOR", null)).toThrow(/BR-01/);
    });
    it("menolak CLOSED severity CRITICAL tanpa capa_id", () => {
        expect(() => (0, ncr_lifecycle_1.assertCapaRequiredBeforeClose)("CRITICAL", null)).toThrow(/BR-01/);
    });
    it("mengizinkan CLOSED severity MAJOR dengan capa_id terisi", () => {
        expect(() => (0, ncr_lifecycle_1.assertCapaRequiredBeforeClose)("MAJOR", "capa-1")).not.toThrow();
    });
    it("mengizinkan CLOSED severity MINOR tanpa capa_id", () => {
        expect(() => (0, ncr_lifecycle_1.assertCapaRequiredBeforeClose)("MINOR", null)).not.toThrow();
    });
});
describe("assertReInspectionPassedBeforeClose (BR-07)", () => {
    it("menolak CLOSED disposition REWORK tanpa re_inspection_result=PASS", () => {
        expect(() => (0, ncr_lifecycle_1.assertReInspectionPassedBeforeClose)("REWORK", "NOT_YET")).toThrow(/BR-07/);
        expect(() => (0, ncr_lifecycle_1.assertReInspectionPassedBeforeClose)("REWORK", null)).toThrow(/BR-07/);
        expect(() => (0, ncr_lifecycle_1.assertReInspectionPassedBeforeClose)("REWORK", "FAIL")).toThrow(/BR-07/);
    });
    it("mengizinkan CLOSED disposition REWORK dengan re_inspection_result=PASS", () => {
        expect(() => (0, ncr_lifecycle_1.assertReInspectionPassedBeforeClose)("REWORK", "PASS")).not.toThrow();
    });
    it("mengizinkan CLOSED disposition USE_AS_IS tanpa re_inspection_result", () => {
        expect(() => (0, ncr_lifecycle_1.assertReInspectionPassedBeforeClose)("USE_AS_IS", null)).not.toThrow();
    });
});
describe("resolveReInspectionRequired", () => {
    it("TRUE utk REWORK/REPAIR", () => {
        expect((0, ncr_lifecycle_1.resolveReInspectionRequired)("REWORK")).toBe(true);
        expect((0, ncr_lifecycle_1.resolveReInspectionRequired)("REPAIR")).toBe(true);
    });
    it("FALSE utk disposition lain", () => {
        expect((0, ncr_lifecycle_1.resolveReInspectionRequired)("USE_AS_IS")).toBe(false);
        expect((0, ncr_lifecycle_1.resolveReInspectionRequired)("SCRAP")).toBe(false);
    });
});
