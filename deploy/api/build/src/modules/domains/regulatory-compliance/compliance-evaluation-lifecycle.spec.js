"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const compliance_evaluation_lifecycle_1 = require("./compliance-evaluation-lifecycle");
describe("validateComplianceEvaluationStatusTransition", () => {
    it.each([
        ["DRAFT", "SUBMITTED"],
        ["SUBMITTED", "REVIEWED"],
        ["SUBMITTED", "DRAFT"],
        ["REVIEWED", "CLOSED"],
    ])("allows %s -> %s", (from, to) => {
        expect(() => (0, compliance_evaluation_lifecycle_1.validateComplianceEvaluationStatusTransition)(from, to)).not.toThrow();
    });
    it.each([
        ["DRAFT", "REVIEWED"],
        ["DRAFT", "CLOSED"],
        ["SUBMITTED", "CLOSED"],
        ["REVIEWED", "DRAFT"],
        ["REVIEWED", "SUBMITTED"],
        ["CLOSED", "DRAFT"],
        ["CLOSED", "REVIEWED"],
    ])("rejects %s -> %s", (from, to) => {
        expect(() => (0, compliance_evaluation_lifecycle_1.validateComplianceEvaluationStatusTransition)(from, to)).toThrow();
    });
});
describe("assertCanCloseEvaluation (BR-03)", () => {
    it.each(["NON_COMPLIANT", "PARTIALLY_COMPLIANT"])("throws when compliance_status=%s and linked_capa_id is null", (status) => {
        expect(() => (0, compliance_evaluation_lifecycle_1.assertCanCloseEvaluation)(status, null)).toThrow(/BR-03/);
    });
    it.each(["NON_COMPLIANT", "PARTIALLY_COMPLIANT"])("allows when compliance_status=%s and linked_capa_id is filled", (status) => {
        expect(() => (0, compliance_evaluation_lifecycle_1.assertCanCloseEvaluation)(status, "11111111-1111-1111-1111-111111111111")).not.toThrow();
    });
    it.each(["COMPLIANT", "NOT_APPLICABLE"])("allows %s without linked_capa_id", (status) => {
        expect(() => (0, compliance_evaluation_lifecycle_1.assertCanCloseEvaluation)(status, null)).not.toThrow();
    });
});
describe("computeNextObligationDueDate (BR-06)", () => {
    const CLOSED_AT = new Date(Date.UTC(2026, 6, 25));
    it("adds 1 month for MONTHLY", () => {
        expect((0, compliance_evaluation_lifecycle_1.computeNextObligationDueDate)(CLOSED_AT, "MONTHLY")).toEqual(new Date(Date.UTC(2026, 7, 25)));
    });
    it("adds 3 months for QUARTERLY", () => {
        expect((0, compliance_evaluation_lifecycle_1.computeNextObligationDueDate)(CLOSED_AT, "QUARTERLY")).toEqual(new Date(Date.UTC(2026, 9, 25)));
    });
    it("adds 6 months for SEMI_ANNUAL", () => {
        expect((0, compliance_evaluation_lifecycle_1.computeNextObligationDueDate)(CLOSED_AT, "SEMI_ANNUAL")).toEqual(new Date(Date.UTC(2027, 0, 25)));
    });
    it("adds 12 months for ANNUAL", () => {
        expect((0, compliance_evaluation_lifecycle_1.computeNextObligationDueDate)(CLOSED_AT, "ANNUAL")).toEqual(new Date(Date.UTC(2027, 6, 25)));
    });
    it.each(["ONE_TIME", "AS_NEEDED"])("returns null for %s (no fixed cycle)", (frequency) => {
        expect((0, compliance_evaluation_lifecycle_1.computeNextObligationDueDate)(CLOSED_AT, frequency)).toBeNull();
    });
});
