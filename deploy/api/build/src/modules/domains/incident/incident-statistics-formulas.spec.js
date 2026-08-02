"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const incident_statistics_formulas_1 = require("./incident-statistics-formulas");
const BASE_INPUT = {
    ltiCount: 2,
    restrictedWorkCount: 1,
    medicalTreatmentCount: 3,
    totalDaysLost: 40,
    totalManhoursWorked: 500_000,
    rateBaseHoursUsed: 1_000_000,
};
describe("calculateLtifr", () => {
    it("(ltiCount * rateBaseHoursUsed) / totalManhoursWorked", () => {
        expect((0, incident_statistics_formulas_1.calculateLtifr)(BASE_INPUT)).toBeCloseTo((2 * 1_000_000) / 500_000);
    });
    it("totalManhoursWorked=0 -> 0 (bukan NaN/Infinity)", () => {
        expect((0, incident_statistics_formulas_1.calculateLtifr)({ ...BASE_INPUT, totalManhoursWorked: 0 })).toBe(0);
    });
});
describe("calculateTrir", () => {
    it("((ltiCount+restrictedWorkCount+medicalTreatmentCount) * rateBaseHoursUsed) / totalManhoursWorked — TIDAK menghitung fatality (literal PRD)", () => {
        expect((0, incident_statistics_formulas_1.calculateTrir)(BASE_INPUT)).toBeCloseTo(((2 + 1 + 3) * 1_000_000) / 500_000);
    });
    it("totalManhoursWorked=0 -> 0", () => {
        expect((0, incident_statistics_formulas_1.calculateTrir)({ ...BASE_INPUT, totalManhoursWorked: 0 })).toBe(0);
    });
});
describe("calculateSeverityRate", () => {
    it("(totalDaysLost * rateBaseHoursUsed) / totalManhoursWorked", () => {
        expect((0, incident_statistics_formulas_1.calculateSeverityRate)(BASE_INPUT)).toBeCloseTo((40 * 1_000_000) / 500_000);
    });
    it("totalManhoursWorked=0 -> 0", () => {
        expect((0, incident_statistics_formulas_1.calculateSeverityRate)({ ...BASE_INPUT, totalManhoursWorked: 0 })).toBe(0);
    });
});
