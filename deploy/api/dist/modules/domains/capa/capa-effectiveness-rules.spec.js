"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const capa_effectiveness_rules_1 = require("./capa-effectiveness-rules");
describe("assertVerifierNotPic (BR-03)", () => {
    it("tidak throw kalau verifier BEDA dari seluruh PIC", () => {
        expect(() => (0, capa_effectiveness_rules_1.assertVerifierNotPic)("verifier-1", ["pic-1", "pic-2"])).not.toThrow();
    });
    it("throw kalau verifier SAMA dengan salah satu PIC", () => {
        expect(() => (0, capa_effectiveness_rules_1.assertVerifierNotPic)("pic-1", ["pic-1", "pic-2"])).toThrow(/BR-03/);
    });
    it("tidak throw kalau belum ada PIC sama sekali", () => {
        expect(() => (0, capa_effectiveness_rules_1.assertVerifierNotPic)("verifier-1", [])).not.toThrow();
    });
});
//# sourceMappingURL=capa-effectiveness-rules.spec.js.map