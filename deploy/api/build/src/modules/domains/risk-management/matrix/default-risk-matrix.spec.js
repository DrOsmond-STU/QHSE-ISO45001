"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const default_risk_matrix_1 = require("./default-risk-matrix");
describe("buildDefaultRiskMatrixLevels", () => {
    it("returns 5 LIKELIHOOD + 5 SEVERITY levels", () => {
        const levels = (0, default_risk_matrix_1.buildDefaultRiskMatrixLevels)();
        expect(levels).toHaveLength(10);
        expect(levels.filter((l) => l.axis === "LIKELIHOOD")).toHaveLength(5);
        expect(levels.filter((l) => l.axis === "SEVERITY")).toHaveLength(5);
    });
    it("levelValue runs 1..5 on each axis with non-empty labels", () => {
        const levels = (0, default_risk_matrix_1.buildDefaultRiskMatrixLevels)();
        const likelihoodValues = levels.filter((l) => l.axis === "LIKELIHOOD").map((l) => l.levelValue).sort();
        const severityValues = levels.filter((l) => l.axis === "SEVERITY").map((l) => l.levelValue).sort();
        expect(likelihoodValues).toEqual([1, 2, 3, 4, 5]);
        expect(severityValues).toEqual([1, 2, 3, 4, 5]);
        expect(levels.every((l) => l.label.length > 0)).toBe(true);
    });
});
describe("buildDefaultRiskMatrixCells", () => {
    const cells = (0, default_risk_matrix_1.buildDefaultRiskMatrixCells)();
    it("returns exactly 25 cells (5x5 grid, one per likelihood/severity combination)", () => {
        expect(cells).toHaveLength(25);
        const uniqueKeys = new Set(cells.map((c) => `${c.likelihoodValue}-${c.severityValue}`));
        expect(uniqueKeys.size).toBe(25);
    });
    it("risk_score is always likelihood x severity (multiplicative formula)", () => {
        for (const cell of cells) {
            expect(cell.riskScore).toBe(cell.likelihoodValue * cell.severityValue);
        }
    });
    it.each([
        [1, 1, 1, "LOW"],
        [2, 2, 4, "LOW"],
        [1, 5, 5, "MEDIUM"],
        [3, 3, 9, "MEDIUM"],
        [2, 5, 10, "HIGH"],
        [3, 5, 15, "HIGH"],
        [4, 5, 20, "EXTREME"],
        [5, 5, 25, "EXTREME"],
    ])("likelihood=%i severity=%i -> score=%i level=%s", (likelihood, severity, expectedScore, expectedLevel) => {
        const cell = cells.find((c) => c.likelihoodValue === likelihood && c.severityValue === severity);
        expect(cell.riskScore).toBe(expectedScore);
        expect(cell.riskLevel).toBe(expectedLevel);
    });
    it("requiresEscalation is true iff riskLevel=EXTREME (task 3.2 — structured flag, not string comparison)", () => {
        for (const cell of cells) {
            expect(cell.requiresEscalation).toBe(cell.riskLevel === "EXTREME");
        }
    });
    it("band boundaries are clean for every achievable score (no gaps/overlaps)", () => {
        const byScore = new Map(cells.map((c) => [c.riskScore, c.riskLevel]));
        expect(byScore.get(4)).toBe("LOW");
        expect(byScore.get(5)).toBe("MEDIUM");
        expect(byScore.get(9)).toBe("MEDIUM");
        expect(byScore.get(10)).toBe("HIGH");
        expect(byScore.get(15)).toBe("HIGH");
        expect(byScore.get(16)).toBe("EXTREME");
    });
    it("every cell has a non-empty color code and required action description", () => {
        expect(cells.every((c) => c.colorCode.startsWith("#"))).toBe(true);
        expect(cells.every((c) => c.requiredActionDescription.length > 0)).toBe(true);
    });
});
