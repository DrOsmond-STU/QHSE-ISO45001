"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const custom_domain_1 = require("./custom-domain");
describe("isValidCustomDomainFormat() — TDD §16", () => {
    it("hostname bertitik biasa -> valid", () => {
        expect((0, custom_domain_1.isValidCustomDomainFormat)("acme.qhse.example.com")).toBe(true);
    });
    it("hostname 2 label -> valid", () => {
        expect((0, custom_domain_1.isValidCustomDomainFormat)("acme.com")).toBe(true);
    });
    it("uppercase -> tetap valid (dicek case-insensitive)", () => {
        expect((0, custom_domain_1.isValidCustomDomainFormat)("ACME.example.com")).toBe(true);
    });
    it("tanpa titik sama sekali -> invalid", () => {
        expect((0, custom_domain_1.isValidCustomDomainFormat)("localhost")).toBe(false);
    });
    it("dgn skema URL (https://) -> invalid, harus hostname polos", () => {
        expect((0, custom_domain_1.isValidCustomDomainFormat)("https://acme.com")).toBe(false);
    });
    it("dgn path -> invalid", () => {
        expect((0, custom_domain_1.isValidCustomDomainFormat)("acme.com/path")).toBe(false);
    });
    it("label diawali/diakhiri hyphen -> invalid", () => {
        expect((0, custom_domain_1.isValidCustomDomainFormat)("-acme.com")).toBe(false);
        expect((0, custom_domain_1.isValidCustomDomainFormat)("acme-.com")).toBe(false);
    });
});
//# sourceMappingURL=custom-domain.spec.js.map