"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hira_lifecycle_1 = require("./hira-lifecycle");
describe("validateHiraAssessmentStatusTransition", () => {
    it.each([
        ["DRAFT", "IN_REVIEW"],
        ["IN_REVIEW", "APPROVED"],
        ["IN_REVIEW", "REQUIRES_REVISION"],
        ["REQUIRES_REVISION", "IN_REVIEW"],
        ["APPROVED", "ACTIVE"],
        ["ACTIVE", "ARCHIVED"],
    ])("allows %s -> %s", (from, to) => {
        expect(() => (0, hira_lifecycle_1.validateHiraAssessmentStatusTransition)(from, to)).not.toThrow();
    });
    it.each([
        ["DRAFT", "APPROVED"],
        ["DRAFT", "ACTIVE"],
        ["IN_REVIEW", "ACTIVE"],
        ["APPROVED", "ARCHIVED"],
        ["ACTIVE", "DRAFT"],
        ["ARCHIVED", "DRAFT"],
        ["REQUIRES_REVISION", "APPROVED"],
    ])("rejects %s -> %s", (from, to) => {
        expect(() => (0, hira_lifecycle_1.validateHiraAssessmentStatusTransition)(from, to)).toThrow();
    });
});
describe("anyHazardLineRequiresEscalation (PRD §4.1 poin 3 — percabangan kondisional)", () => {
    it("returns false when no line requires escalation", () => {
        expect((0, hira_lifecycle_1.anyHazardLineRequiresEscalation)([{ requiresEscalationBefore: false }, { requiresEscalationBefore: false }])).toBe(false);
    });
    it("returns true when at least one line requires escalation", () => {
        expect((0, hira_lifecycle_1.anyHazardLineRequiresEscalation)([{ requiresEscalationBefore: false }, { requiresEscalationBefore: true }])).toBe(true);
    });
    it("returns false for empty line list", () => {
        expect((0, hira_lifecycle_1.anyHazardLineRequiresEscalation)([])).toBe(false);
    });
});
