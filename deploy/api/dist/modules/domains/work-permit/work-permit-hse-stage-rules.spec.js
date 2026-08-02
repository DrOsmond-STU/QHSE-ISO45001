"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const work_permit_hse_stage_rules_1 = require("./work-permit-hse-stage-rules");
describe("computeHasHseStage — BR-04", () => {
    it("true kalau risk_level=HIGH, apa pun requiresHseApproval", () => {
        expect((0, work_permit_hse_stage_rules_1.computeHasHseStage)("HIGH", false)).toBe(true);
        expect((0, work_permit_hse_stage_rules_1.computeHasHseStage)("HIGH", true)).toBe(true);
    });
    it("true kalau requiresHseApproval=true, apa pun risk_level", () => {
        expect((0, work_permit_hse_stage_rules_1.computeHasHseStage)("LOW", true)).toBe(true);
        expect((0, work_permit_hse_stage_rules_1.computeHasHseStage)("MEDIUM", true)).toBe(true);
    });
    it("false kalau risk_level bukan HIGH DAN requiresHseApproval=false", () => {
        expect((0, work_permit_hse_stage_rules_1.computeHasHseStage)("LOW", false)).toBe(false);
        expect((0, work_permit_hse_stage_rules_1.computeHasHseStage)("MEDIUM", false)).toBe(false);
    });
});
//# sourceMappingURL=work-permit-hse-stage-rules.spec.js.map