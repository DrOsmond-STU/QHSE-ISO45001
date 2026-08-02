"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const risk_treatment_rules_1 = require("./risk-treatment-rules");
describe("assertAcceptRequiresTopManagementApproval (BR-06)", () => {
    it("throws when strategy=ACCEPT, source requires escalation, and no top-management approver", () => {
        expect(() => (0, risk_treatment_rules_1.assertAcceptRequiresTopManagementApproval)("ACCEPT", true, null)).toThrow(/BR-06/);
    });
    it("allows when strategy=ACCEPT, source requires escalation, and top-management approver present", () => {
        expect(() => (0, risk_treatment_rules_1.assertAcceptRequiresTopManagementApproval)("ACCEPT", true, "user-1")).not.toThrow();
    });
    it("allows strategy=ACCEPT on a source that does NOT require escalation, no approver needed", () => {
        expect(() => (0, risk_treatment_rules_1.assertAcceptRequiresTopManagementApproval)("ACCEPT", false, null)).not.toThrow();
    });
    it.each(["AVOID", "REDUCE_MITIGATE", "TRANSFER"])("allows strategy=%s on an escalation-requiring source without top-management approver (gate only applies to ACCEPT)", (strategy) => {
        expect(() => (0, risk_treatment_rules_1.assertAcceptRequiresTopManagementApproval)(strategy, true, null)).not.toThrow();
    });
});
//# sourceMappingURL=risk-treatment-rules.spec.js.map