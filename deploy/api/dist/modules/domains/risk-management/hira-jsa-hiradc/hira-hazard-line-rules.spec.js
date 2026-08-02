"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hira_hazard_line_rules_1 = require("./hira-hazard-line-rules");
describe("assertControlsPresentIfStillHighRisk (BR-02)", () => {
    it("throws when riskLevelAfter=HIGH and additionalControlsRequired missing", () => {
        expect(() => (0, hira_hazard_line_rules_1.assertControlsPresentIfStillHighRisk)({ riskLevelAfter: "HIGH", requiresEscalationAfter: false, additionalControlsRequired: null })).toThrow(/BR-02/);
    });
    it("throws when requiresEscalationAfter=true (EXTREME) and additionalControlsRequired missing", () => {
        expect(() => (0, hira_hazard_line_rules_1.assertControlsPresentIfStillHighRisk)({ riskLevelAfter: "EXTREME", requiresEscalationAfter: true, additionalControlsRequired: null })).toThrow(/BR-02/);
    });
    it("allows HIGH/EXTREME when additionalControlsRequired is filled", () => {
        expect(() => (0, hira_hazard_line_rules_1.assertControlsPresentIfStillHighRisk)({ riskLevelAfter: "HIGH", requiresEscalationAfter: false, additionalControlsRequired: "Pasang guard rail" })).not.toThrow();
    });
    it("allows LOW/MEDIUM without additionalControlsRequired", () => {
        expect(() => (0, hira_hazard_line_rules_1.assertControlsPresentIfStillHighRisk)({ riskLevelAfter: "LOW", requiresEscalationAfter: false, additionalControlsRequired: null })).not.toThrow();
        expect(() => (0, hira_hazard_line_rules_1.assertControlsPresentIfStillHighRisk)({ riskLevelAfter: "MEDIUM", requiresEscalationAfter: false, additionalControlsRequired: null })).not.toThrow();
    });
    it("treats empty string additionalControlsRequired as missing", () => {
        expect(() => (0, hira_hazard_line_rules_1.assertControlsPresentIfStillHighRisk)({ riskLevelAfter: "HIGH", requiresEscalationAfter: false, additionalControlsRequired: "" })).toThrow();
    });
});
describe("assertAllControlsPresentIfStillHighRisk", () => {
    it("checks every line, throws on first violation", () => {
        const lines = [
            { riskLevelAfter: "LOW", requiresEscalationAfter: false, additionalControlsRequired: null },
            { riskLevelAfter: "HIGH", requiresEscalationAfter: false, additionalControlsRequired: null },
        ];
        expect(() => (0, hira_hazard_line_rules_1.assertAllControlsPresentIfStillHighRisk)(lines)).toThrow(/BR-02/);
    });
    it("passes when all lines satisfy BR-02", () => {
        const lines = [
            { riskLevelAfter: "LOW", requiresEscalationAfter: false, additionalControlsRequired: null },
            { riskLevelAfter: "HIGH", requiresEscalationAfter: false, additionalControlsRequired: "Kontrol tambahan" },
        ];
        expect(() => (0, hira_hazard_line_rules_1.assertAllControlsPresentIfStillHighRisk)(lines)).not.toThrow();
    });
    it("passes for empty line list", () => {
        expect(() => (0, hira_hazard_line_rules_1.assertAllControlsPresentIfStillHighRisk)([])).not.toThrow();
    });
});
//# sourceMappingURL=hira-hazard-line-rules.spec.js.map