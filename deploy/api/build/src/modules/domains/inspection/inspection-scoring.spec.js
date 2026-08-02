"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inspection_scoring_1 = require("./inspection-scoring");
describe("computeItemScore", () => {
    it("PASS_FAIL: PASS->weight, FAIL->0, lainnya->null", () => {
        expect((0, inspection_scoring_1.computeItemScore)("PASS_FAIL", "PASS", 2)).toBe(2);
        expect((0, inspection_scoring_1.computeItemScore)("PASS_FAIL", "FAIL", 2)).toBe(0);
        expect((0, inspection_scoring_1.computeItemScore)("PASS_FAIL", "N/A", 2)).toBeNull();
    });
    it("YES_NO: YES->weight, NO->0", () => {
        expect((0, inspection_scoring_1.computeItemScore)("YES_NO", "YES", 3)).toBe(3);
        expect((0, inspection_scoring_1.computeItemScore)("YES_NO", "NO", 3)).toBe(0);
    });
    it("SCALE_1_5: proporsional (value/5)*weight, di luar 1-5 -> null", () => {
        expect((0, inspection_scoring_1.computeItemScore)("SCALE_1_5", "5", 10)).toBe(10);
        expect((0, inspection_scoring_1.computeItemScore)("SCALE_1_5", "3", 10)).toBe(6);
        expect((0, inspection_scoring_1.computeItemScore)("SCALE_1_5", "0", 10)).toBeNull();
        expect((0, inspection_scoring_1.computeItemScore)("SCALE_1_5", "abc", 10)).toBeNull();
    });
    it("TEXT/NUMERIC -> selalu null (tidak diskor langsung)", () => {
        expect((0, inspection_scoring_1.computeItemScore)("TEXT", "catatan bebas", 1)).toBeNull();
        expect((0, inspection_scoring_1.computeItemScore)("NUMERIC", "42", 1)).toBeNull();
    });
});
describe("computeOverallScore", () => {
    it("mengagregasi hanya item scoreable (bukan null), sbg persentase", () => {
        const result = (0, inspection_scoring_1.computeOverallScore)([
            { scoreObtained: 2, weight: 2 },
            { scoreObtained: 0, weight: 2 },
            { scoreObtained: null, weight: 5 }, // dikeluarkan, TIDAK menurunkan skor
        ]);
        expect(result).toBeCloseTo(50); // 2/4 * 100
    });
    it("seluruh item null -> null", () => {
        expect((0, inspection_scoring_1.computeOverallScore)([{ scoreObtained: null, weight: 1 }])).toBeNull();
    });
});
describe("computeAllMandatoryItemsPassed", () => {
    it("PASS_FAIL/YES_NO mandatory harus PASS/YES; item opsional/non-scoreable tidak memblokir", () => {
        expect((0, inspection_scoring_1.computeAllMandatoryItemsPassed)([
            { isMandatory: true, responseType: "PASS_FAIL", responseValue: "PASS" },
            { isMandatory: true, responseType: "YES_NO", responseValue: "YES" },
            { isMandatory: false, responseType: "PASS_FAIL", responseValue: "FAIL" },
            { isMandatory: true, responseType: "TEXT", responseValue: "catatan" },
        ])).toBe(true);
    });
    it("satu item mandatory FAIL -> false", () => {
        expect((0, inspection_scoring_1.computeAllMandatoryItemsPassed)([{ isMandatory: true, responseType: "PASS_FAIL", responseValue: "FAIL" }])).toBe(false);
    });
});
describe("computeOverallResult", () => {
    it("CHECKLIST_NO_SCORE -> selalu NA", () => {
        expect((0, inspection_scoring_1.computeOverallResult)("CHECKLIST_NO_SCORE", 100, null, true)).toBe("NA");
    });
    it("PASS_FAIL_ONLY -> PASS/FAIL dari allMandatoryPassed, mengabaikan overallScore/threshold", () => {
        expect((0, inspection_scoring_1.computeOverallResult)("PASS_FAIL_ONLY", null, null, true)).toBe("PASS");
        expect((0, inspection_scoring_1.computeOverallResult)("PASS_FAIL_ONLY", null, null, false)).toBe("FAIL");
    });
    it("WEIGHTED_SCORE -> bandingkan ke passingScoreThreshold", () => {
        expect((0, inspection_scoring_1.computeOverallResult)("WEIGHTED_SCORE", 80, 75, true)).toBe("PASS");
        expect((0, inspection_scoring_1.computeOverallResult)("WEIGHTED_SCORE", 70, 75, true)).toBe("FAIL");
    });
    it("WEIGHTED_SCORE tanpa overallScore/threshold -> NA (fallback aman)", () => {
        expect((0, inspection_scoring_1.computeOverallResult)("WEIGHTED_SCORE", null, 75, true)).toBe("NA");
        expect((0, inspection_scoring_1.computeOverallResult)("WEIGHTED_SCORE", 80, null, true)).toBe("NA");
    });
});
