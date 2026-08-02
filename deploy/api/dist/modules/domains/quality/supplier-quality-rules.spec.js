"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supplier_quality_rules_1 = require("./supplier-quality-rules");
describe("validateSupplierRecordStatusTransition", () => {
    it("mengizinkan alur penuh DRAFT->SUBMITTED->APPROVED->ARCHIVED", () => {
        expect(() => (0, supplier_quality_rules_1.validateSupplierRecordStatusTransition)("DRAFT", "SUBMITTED")).not.toThrow();
        expect(() => (0, supplier_quality_rules_1.validateSupplierRecordStatusTransition)("SUBMITTED", "APPROVED")).not.toThrow();
        expect(() => (0, supplier_quality_rules_1.validateSupplierRecordStatusTransition)("APPROVED", "ARCHIVED")).not.toThrow();
    });
    it("mengizinkan SUBMITTED kembali ke DRAFT (reject/revisi)", () => {
        expect(() => (0, supplier_quality_rules_1.validateSupplierRecordStatusTransition)("SUBMITTED", "DRAFT")).not.toThrow();
    });
    it("menolak lompat DRAFT langsung ke APPROVED", () => {
        expect(() => (0, supplier_quality_rules_1.validateSupplierRecordStatusTransition)("DRAFT", "APPROVED")).toThrow(/tidak valid/);
    });
});
describe("assertCapaRequiredForRating", () => {
    it("menolak rating CONDITIONAL/SUSPENDED tanpa capa_id", () => {
        expect(() => (0, supplier_quality_rules_1.assertCapaRequiredForRating)("CONDITIONAL", null)).toThrow();
        expect(() => (0, supplier_quality_rules_1.assertCapaRequiredForRating)("SUSPENDED", null)).toThrow();
    });
    it("mengizinkan rating APPROVED/DISQUALIFIED tanpa capa_id", () => {
        expect(() => (0, supplier_quality_rules_1.assertCapaRequiredForRating)("APPROVED", null)).not.toThrow();
        expect(() => (0, supplier_quality_rules_1.assertCapaRequiredForRating)("DISQUALIFIED", null)).not.toThrow();
    });
});
//# sourceMappingURL=supplier-quality-rules.spec.js.map