"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const risk_register_lifecycle_1 = require("./risk-register-lifecycle");
describe("validateRiskRegisterStatusTransition", () => {
    it.each([
        ["IDENTIFIED", "ASSESSED"],
        ["ASSESSED", "TREATMENT_IN_PROGRESS"],
        ["TREATMENT_IN_PROGRESS", "MONITORED"],
        ["MONITORED", "CLOSED"],
    ])("allows %s -> %s", (from, to) => {
        expect(() => (0, risk_register_lifecycle_1.validateRiskRegisterStatusTransition)(from, to)).not.toThrow();
    });
    it.each([
        ["IDENTIFIED", "MONITORED"],
        ["ASSESSED", "MONITORED"],
        ["ASSESSED", "CLOSED"],
        ["MONITORED", "TREATMENT_IN_PROGRESS"],
        ["CLOSED", "MONITORED"],
        ["CLOSED", "IDENTIFIED"],
    ])("rejects %s -> %s", (from, to) => {
        expect(() => (0, risk_register_lifecycle_1.validateRiskRegisterStatusTransition)(from, to)).toThrow();
    });
});
//# sourceMappingURL=risk-register-lifecycle.spec.js.map