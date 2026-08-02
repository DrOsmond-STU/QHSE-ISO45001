"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsa_lifecycle_1 = require("./jsa-lifecycle");
describe("validateJsaRecordStatusTransition", () => {
    it.each([
        ["DRAFT", "APPROVED"],
        ["APPROVED", "ACTIVE"],
        ["ACTIVE", "EXPIRED"],
        ["ACTIVE", "ARCHIVED"],
        ["EXPIRED", "ARCHIVED"],
    ])("allows %s -> %s", (from, to) => {
        expect(() => (0, jsa_lifecycle_1.validateJsaRecordStatusTransition)(from, to)).not.toThrow();
    });
    it.each([
        ["DRAFT", "ACTIVE"],
        ["DRAFT", "EXPIRED"],
        ["APPROVED", "EXPIRED"],
        ["APPROVED", "ARCHIVED"],
        ["ARCHIVED", "ACTIVE"],
        ["EXPIRED", "ACTIVE"],
    ])("rejects %s -> %s", (from, to) => {
        expect(() => (0, jsa_lifecycle_1.validateJsaRecordStatusTransition)(from, to)).toThrow();
    });
});
//# sourceMappingURL=jsa-lifecycle.spec.js.map