"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const proper_assessment_rules_1 = require("./proper-assessment-rules");
describe("calculateComplianceScorePercentage", () => {
    it("array kosong -> 0", () => {
        expect((0, proper_assessment_rules_1.calculateComplianceScorePercentage)([])).toBe(0);
    });
    it("satu kriteria -> skor kriteria itu sendiri", () => {
        expect((0, proper_assessment_rules_1.calculateComplianceScorePercentage)([{ scoreValue: 75, weightPercentage: 100 }])).toBe(75);
    });
    it("rata-rata terbobot dari beberapa kriteria", () => {
        const score = (0, proper_assessment_rules_1.calculateComplianceScorePercentage)([
            { scoreValue: 100, weightPercentage: 50 },
            { scoreValue: 0, weightPercentage: 50 },
        ]);
        expect(score).toBe(50);
    });
    it("bobot tidak sama rata dihitung proporsional", () => {
        const score = (0, proper_assessment_rules_1.calculateComplianceScorePercentage)([
            { scoreValue: 100, weightPercentage: 80 },
            { scoreValue: 0, weightPercentage: 20 },
        ]);
        expect(score).toBe(80);
    });
});
describe("deriveProperRating", () => {
    it("HITAM di bawah 20%", () => {
        expect((0, proper_assessment_rules_1.deriveProperRating)(10)).toBe("HITAM");
    });
    it("MERAH 20-40%", () => {
        expect((0, proper_assessment_rules_1.deriveProperRating)(30)).toBe("MERAH");
    });
    it("BIRU 40-60%", () => {
        expect((0, proper_assessment_rules_1.deriveProperRating)(50)).toBe("BIRU");
    });
    it("HIJAU 60-80%", () => {
        expect((0, proper_assessment_rules_1.deriveProperRating)(70)).toBe("HIJAU");
    });
    it("EMAS 80% ke atas", () => {
        expect((0, proper_assessment_rules_1.deriveProperRating)(95)).toBe("EMAS");
        expect((0, proper_assessment_rules_1.deriveProperRating)(100)).toBe("EMAS");
    });
});
describe("assertOverrideJustificationRequired (BR-06)", () => {
    it("bukan override -> lolos tanpa justification", () => {
        expect(() => (0, proper_assessment_rules_1.assertOverrideJustificationRequired)(false, null)).not.toThrow();
    });
    it("override tanpa justification ditolak", () => {
        expect(() => (0, proper_assessment_rules_1.assertOverrideJustificationRequired)(true, null)).toThrow(/BR-06/);
    });
    it("override dengan justification lolos", () => {
        expect(() => (0, proper_assessment_rules_1.assertOverrideJustificationRequired)(true, "Data sampling lab terbaru belum masuk sistem")).not.toThrow();
    });
});
describe("validateProperSubmissionStatusTransition", () => {
    it("siklus penuh DRAFT->INTERNAL_REVIEWED->SUBMITTED_TO_KLHK->RESULT_RECEIVED valid", () => {
        expect(() => (0, proper_assessment_rules_1.validateProperSubmissionStatusTransition)("DRAFT", "INTERNAL_REVIEWED")).not.toThrow();
        expect(() => (0, proper_assessment_rules_1.validateProperSubmissionStatusTransition)("INTERNAL_REVIEWED", "SUBMITTED_TO_KLHK")).not.toThrow();
        expect(() => (0, proper_assessment_rules_1.validateProperSubmissionStatusTransition)("SUBMITTED_TO_KLHK", "RESULT_RECEIVED")).not.toThrow();
    });
    it("INTERNAL_REVIEWED->DRAFT valid (dikembalikan utk revisi)", () => {
        expect(() => (0, proper_assessment_rules_1.validateProperSubmissionStatusTransition)("INTERNAL_REVIEWED", "DRAFT")).not.toThrow();
    });
    it("RESULT_RECEIVED bersifat terminal", () => {
        expect(() => (0, proper_assessment_rules_1.validateProperSubmissionStatusTransition)("RESULT_RECEIVED", "DRAFT")).toThrow(/tidak valid/);
    });
    it("DRAFT->SUBMITTED_TO_KLHK langsung ditolak", () => {
        expect(() => (0, proper_assessment_rules_1.validateProperSubmissionStatusTransition)("DRAFT", "SUBMITTED_TO_KLHK")).toThrow(/tidak valid/);
    });
});
