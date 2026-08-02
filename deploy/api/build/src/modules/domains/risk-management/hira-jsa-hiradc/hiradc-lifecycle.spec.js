"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hiradc_lifecycle_1 = require("./hiradc-lifecycle");
describe("validateHiradcRecordStatusTransition", () => {
    it.each([
        ["DRAFT", "VERIFIED"],
        ["VERIFIED", "APPROVED"],
        ["VERIFIED", "EXPIRED"],
        ["APPROVED", "EXPIRED"],
    ])("allows %s -> %s", (from, to) => {
        expect(() => (0, hiradc_lifecycle_1.validateHiradcRecordStatusTransition)(from, to)).not.toThrow();
    });
    it.each([
        ["DRAFT", "APPROVED"],
        ["DRAFT", "EXPIRED"],
        ["APPROVED", "VERIFIED"],
        ["EXPIRED", "DRAFT"],
    ])("rejects %s -> %s", (from, to) => {
        expect(() => (0, hiradc_lifecycle_1.validateHiradcRecordStatusTransition)(from, to)).toThrow();
    });
});
describe("assertHasBaselineOrStandaloneLines (BR-03)", () => {
    it("allows when related_hira_id is present", () => {
        expect(() => (0, hiradc_lifecycle_1.assertHasBaselineOrStandaloneLines)({ relatedHiraId: "hira-1", relatedJsaId: null, lineCount: 0 })).not.toThrow();
    });
    it("allows when related_jsa_id is present", () => {
        expect(() => (0, hiradc_lifecycle_1.assertHasBaselineOrStandaloneLines)({ relatedHiraId: null, relatedJsaId: "jsa-1", lineCount: 0 })).not.toThrow();
    });
    it("allows when no baseline but standalone lines exist", () => {
        expect(() => (0, hiradc_lifecycle_1.assertHasBaselineOrStandaloneLines)({ relatedHiraId: null, relatedJsaId: null, lineCount: 1 })).not.toThrow();
    });
    it("throws when no baseline and no standalone lines", () => {
        expect(() => (0, hiradc_lifecycle_1.assertHasBaselineOrStandaloneLines)({ relatedHiraId: null, relatedJsaId: null, lineCount: 0 })).toThrow(/BR-03/);
    });
});
