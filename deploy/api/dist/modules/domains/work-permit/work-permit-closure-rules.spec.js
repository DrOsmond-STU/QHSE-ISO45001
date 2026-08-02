"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const work_permit_closure_rules_1 = require("./work-permit-closure-rules");
describe("assertClosureReadyForClosed — BR-06", () => {
    it("melempar kalau closure belum VERIFIED", () => {
        expect(() => (0, work_permit_closure_rules_1.assertClosureReadyForClosed)("SUBMITTED", false, false)).toThrow();
        expect(() => (0, work_permit_closure_rules_1.assertClosureReadyForClosed)("RETURNED", false, false)).toThrow();
    });
    it("tidak melempar kalau VERIFIED dan requiresLoto=false, apa pun isolationRemovedConfirmed", () => {
        expect(() => (0, work_permit_closure_rules_1.assertClosureReadyForClosed)("VERIFIED", false, false)).not.toThrow();
        expect(() => (0, work_permit_closure_rules_1.assertClosureReadyForClosed)("VERIFIED", false, true)).not.toThrow();
    });
    it("melempar kalau VERIFIED, requiresLoto=true, tapi isolationRemovedConfirmed=false", () => {
        expect(() => (0, work_permit_closure_rules_1.assertClosureReadyForClosed)("VERIFIED", true, false)).toThrow();
    });
    it("tidak melempar kalau VERIFIED, requiresLoto=true, DAN isolationRemovedConfirmed=true", () => {
        expect(() => (0, work_permit_closure_rules_1.assertClosureReadyForClosed)("VERIFIED", true, true)).not.toThrow();
    });
});
//# sourceMappingURL=work-permit-closure-rules.spec.js.map