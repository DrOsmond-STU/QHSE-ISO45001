"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const regulatory_register_rules_1 = require("./regulatory-register-rules");
describe("assertRegisterAcceptsNewObligation (BR-04)", () => {
    it.each(["SUPERSEDED", "REVOKED"])("throws when register status=%s", (status) => {
        expect(() => (0, regulatory_register_rules_1.assertRegisterAcceptsNewObligation)(status)).toThrow(/BR-04/);
    });
    it("allows when register status=ACTIVE", () => {
        expect(() => (0, regulatory_register_rules_1.assertRegisterAcceptsNewObligation)("ACTIVE")).not.toThrow();
    });
});
describe("assertApplicableScopeConsistency (BR-07)", () => {
    it("throws when scope=SPECIFIC_SITE and applicable_site_id is null", () => {
        expect(() => (0, regulatory_register_rules_1.assertApplicableScopeConsistency)("SPECIFIC_SITE", null, null)).toThrow(/BR-07/);
    });
    it("allows when scope=SPECIFIC_SITE and applicable_site_id is filled", () => {
        expect(() => (0, regulatory_register_rules_1.assertApplicableScopeConsistency)("SPECIFIC_SITE", null, "11111111-1111-1111-1111-111111111111")).not.toThrow();
    });
    it("throws when scope=SPECIFIC_COMPANY and applicable_company_id is null", () => {
        expect(() => (0, regulatory_register_rules_1.assertApplicableScopeConsistency)("SPECIFIC_COMPANY", null, null)).toThrow(/BR-07/);
    });
    it("allows when scope=SPECIFIC_COMPANY and applicable_company_id is filled", () => {
        expect(() => (0, regulatory_register_rules_1.assertApplicableScopeConsistency)("SPECIFIC_COMPANY", "11111111-1111-1111-1111-111111111111", null)).not.toThrow();
    });
    it("allows scope=ALL_TENANT with both ids null", () => {
        expect(() => (0, regulatory_register_rules_1.assertApplicableScopeConsistency)("ALL_TENANT", null, null)).not.toThrow();
    });
    it("allows scope=ALL_TENANT even if ids happen to be filled (no over-constraint)", () => {
        expect(() => (0, regulatory_register_rules_1.assertApplicableScopeConsistency)("ALL_TENANT", "11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222")).not.toThrow();
    });
});
