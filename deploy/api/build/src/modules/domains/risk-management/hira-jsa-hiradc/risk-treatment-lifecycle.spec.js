"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const risk_treatment_lifecycle_1 = require("./risk-treatment-lifecycle");
describe("validateRiskTreatmentStatusTransition", () => {
    it.each([
        ["PLANNED", "IN_PROGRESS"],
        ["PLANNED", "CANCELLED"],
        ["IN_PROGRESS", "COMPLETED"],
        ["IN_PROGRESS", "CANCELLED"],
        ["COMPLETED", "VERIFIED_EFFECTIVE"],
    ])("allows %s -> %s", (from, to) => {
        expect(() => (0, risk_treatment_lifecycle_1.validateRiskTreatmentStatusTransition)(from, to)).not.toThrow();
    });
    it.each([
        ["PLANNED", "COMPLETED"],
        ["COMPLETED", "CANCELLED"],
        ["VERIFIED_EFFECTIVE", "PLANNED"],
        ["CANCELLED", "PLANNED"],
    ])("rejects %s -> %s", (from, to) => {
        expect(() => (0, risk_treatment_lifecycle_1.validateRiskTreatmentStatusTransition)(from, to)).toThrow();
    });
});
