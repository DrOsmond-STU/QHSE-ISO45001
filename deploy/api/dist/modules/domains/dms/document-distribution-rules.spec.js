"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const document_distribution_rules_1 = require("./document-distribution-rules");
describe("assertDocumentAcceptsNewDistribution (BR-05)", () => {
    it.each(["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "UNDER_REVISION"])("mengizinkan status %s", (status) => {
        expect(() => (0, document_distribution_rules_1.assertDocumentAcceptsNewDistribution)(status)).not.toThrow();
    });
    it.each(["RETIRED", "OBSOLETE"])("menolak status %s", (status) => {
        expect(() => (0, document_distribution_rules_1.assertDocumentAcceptsNewDistribution)(status)).toThrow();
    });
});
describe("assertClassificationAllowsTarget (BR-07)", () => {
    it.each(["RESTRICTED", "CONFIDENTIAL"])("%s hanya boleh ke USER/ROLE", (classification) => {
        expect(() => (0, document_distribution_rules_1.assertClassificationAllowsTarget)(classification, "USER")).not.toThrow();
        expect(() => (0, document_distribution_rules_1.assertClassificationAllowsTarget)(classification, "ROLE")).not.toThrow();
        expect(() => (0, document_distribution_rules_1.assertClassificationAllowsTarget)(classification, "DEPARTMENT")).toThrow();
        expect(() => (0, document_distribution_rules_1.assertClassificationAllowsTarget)(classification, "SITE")).toThrow();
        expect(() => (0, document_distribution_rules_1.assertClassificationAllowsTarget)(classification, "COMPANY")).toThrow();
        expect(() => (0, document_distribution_rules_1.assertClassificationAllowsTarget)(classification, "ALL_TENANT")).toThrow();
    });
    it.each(["PUBLIC", "INTERNAL"])("%s boleh ke target apa pun termasuk ALL_TENANT", (classification) => {
        expect(() => (0, document_distribution_rules_1.assertClassificationAllowsTarget)(classification, "ALL_TENANT")).not.toThrow();
        expect(() => (0, document_distribution_rules_1.assertClassificationAllowsTarget)(classification, "USER")).not.toThrow();
    });
});
//# sourceMappingURL=document-distribution-rules.spec.js.map