"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aspect_impact_lifecycle_1 = require("./aspect-impact-lifecycle");
describe("calculateSignificanceScore", () => {
    it("rata-rata terbobot sama rata (default 0.2 masing²)", () => {
        expect((0, aspect_impact_lifecycle_1.calculateSignificanceScore)({
            likelihoodScore: 5,
            severityScore: 5,
            frequencyScore: 5,
            regulatoryScore: 5,
            stakeholderConcernScore: 5,
        })).toBe(5);
    });
    it("skor campuran dihitung benar", () => {
        expect((0, aspect_impact_lifecycle_1.calculateSignificanceScore)({
            likelihoodScore: 3,
            severityScore: 4,
            frequencyScore: 2,
            regulatoryScore: 5,
            stakeholderConcernScore: 1,
        })).toBe(3);
    });
    it("bobot custom yang total 1.0 diterima", () => {
        const score = (0, aspect_impact_lifecycle_1.calculateSignificanceScore)({ likelihoodScore: 5, severityScore: 1, frequencyScore: 1, regulatoryScore: 1, stakeholderConcernScore: 1 }, { likelihood: 0.6, severity: 0.1, frequency: 0.1, regulatory: 0.1, stakeholderConcern: 0.1 });
        expect(score).toBe(3.4);
    });
    it("bobot custom yang total BUKAN 1.0 ditolak", () => {
        expect(() => (0, aspect_impact_lifecycle_1.calculateSignificanceScore)({ likelihoodScore: 5, severityScore: 5, frequencyScore: 5, regulatoryScore: 5, stakeholderConcernScore: 5 }, { likelihood: 0.5, severity: 0.5 })).toThrow(/Total bobot/);
    });
});
describe("deriveSignificanceLevel", () => {
    it("SIGNIFICANT jika skor >= threshold", () => {
        expect((0, aspect_impact_lifecycle_1.deriveSignificanceLevel)(4, 4)).toBe("SIGNIFICANT");
        expect((0, aspect_impact_lifecycle_1.deriveSignificanceLevel)(4.5, 4)).toBe("SIGNIFICANT");
    });
    it("NOT_SIGNIFICANT jika skor < threshold", () => {
        expect((0, aspect_impact_lifecycle_1.deriveSignificanceLevel)(3.9, 4)).toBe("NOT_SIGNIFICANT");
    });
});
describe("assertControlsAdequateForActive (BR-01)", () => {
    it("lolos jika NOT_SIGNIFICANT tanpa controls/capa", () => {
        expect(() => (0, aspect_impact_lifecycle_1.assertControlsAdequateForActive)("NOT_SIGNIFICANT", null, null)).not.toThrow();
    });
    it("SIGNIFICANT tanpa existing_controls maupun capa_id ditolak", () => {
        expect(() => (0, aspect_impact_lifecycle_1.assertControlsAdequateForActive)("SIGNIFICANT", null, null)).toThrow(/BR-01/);
    });
    it("SIGNIFICANT dgn existing_controls terisi lolos", () => {
        expect(() => (0, aspect_impact_lifecycle_1.assertControlsAdequateForActive)("SIGNIFICANT", "Filter udara terpasang", null)).not.toThrow();
    });
    it("SIGNIFICANT dgn capa_id terisi lolos", () => {
        expect(() => (0, aspect_impact_lifecycle_1.assertControlsAdequateForActive)("SIGNIFICANT", null, "capa-uuid")).not.toThrow();
    });
});
describe("validateAspectImpactStatusTransition", () => {
    it("DRAFT->UNDER_REVIEW valid", () => {
        expect(() => (0, aspect_impact_lifecycle_1.validateAspectImpactStatusTransition)("DRAFT", "UNDER_REVIEW")).not.toThrow();
    });
    it("UNDER_REVIEW->ACTIVE valid", () => {
        expect(() => (0, aspect_impact_lifecycle_1.validateAspectImpactStatusTransition)("UNDER_REVIEW", "ACTIVE")).not.toThrow();
    });
    it("ACTIVE->UNDER_REVIEW valid (review tahunan)", () => {
        expect(() => (0, aspect_impact_lifecycle_1.validateAspectImpactStatusTransition)("ACTIVE", "UNDER_REVIEW")).not.toThrow();
    });
    it("ARCHIVED->apa pun ditolak (status terminal)", () => {
        expect(() => (0, aspect_impact_lifecycle_1.validateAspectImpactStatusTransition)("ARCHIVED", "DRAFT")).toThrow(/tidak valid/);
    });
    it("DRAFT->ACTIVE langsung ditolak (wajib lewat UNDER_REVIEW)", () => {
        expect(() => (0, aspect_impact_lifecycle_1.validateAspectImpactStatusTransition)("DRAFT", "ACTIVE")).toThrow(/tidak valid/);
    });
});
