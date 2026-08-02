"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const risk_matrix_lookup_1 = require("./risk-matrix-lookup");
const CELLS = [
    { likelihoodValue: 1, severityValue: 1, riskScore: 1, riskLevel: "LOW", requiresEscalation: false },
    { likelihoodValue: 2, severityValue: 3, riskScore: 6, riskLevel: "MEDIUM", requiresEscalation: false },
    { likelihoodValue: 5, severityValue: 5, riskScore: 25, riskLevel: "EXTREME", requiresEscalation: true },
];
describe("resolveRiskScore (BR-01)", () => {
    it("returns the matching cell's score, level, and requiresEscalation flag", () => {
        expect((0, risk_matrix_lookup_1.resolveRiskScore)(CELLS, 2, 3)).toEqual({ riskScore: 6, riskLevel: "MEDIUM", requiresEscalation: false });
    });
    it("matches the exact likelihood+severity pair, not a partial match", () => {
        expect((0, risk_matrix_lookup_1.resolveRiskScore)(CELLS, 1, 1)).toEqual({ riskScore: 1, riskLevel: "LOW", requiresEscalation: false });
        expect((0, risk_matrix_lookup_1.resolveRiskScore)(CELLS, 5, 5)).toEqual({ riskScore: 25, riskLevel: "EXTREME", requiresEscalation: true });
    });
    it("throws when no cell matches the given combination", () => {
        expect(() => (0, risk_matrix_lookup_1.resolveRiskScore)(CELLS, 3, 3)).toThrow(/Tidak ada risk_matrix_cells/);
    });
    it("throws on likelihood/severity swapped (asymmetric, not just any match)", () => {
        // CELLS only has (2,3), not (3,2) — swapping should NOT accidentally match.
        expect(() => (0, risk_matrix_lookup_1.resolveRiskScore)(CELLS, 3, 2)).toThrow();
    });
    it("throws on empty candidate list", () => {
        expect(() => (0, risk_matrix_lookup_1.resolveRiskScore)([], 1, 1)).toThrow();
    });
});
//# sourceMappingURL=risk-matrix-lookup.spec.js.map