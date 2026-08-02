"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emergency_response_plan_lifecycle_1 = require("./emergency-response-plan-lifecycle");
describe("validateEmergencyResponsePlanStatusTransition", () => {
    it("mengizinkan DRAFT->UNDER_REVIEW", () => {
        expect(() => (0, emergency_response_plan_lifecycle_1.validateEmergencyResponsePlanStatusTransition)("DRAFT", "UNDER_REVIEW")).not.toThrow();
    });
    it("mengizinkan UNDER_REVIEW->APPROVED_ACTIVE", () => {
        expect(() => (0, emergency_response_plan_lifecycle_1.validateEmergencyResponsePlanStatusTransition)("UNDER_REVIEW", "APPROVED_ACTIVE")).not.toThrow();
    });
    it("mengizinkan UNDER_REVIEW->DRAFT (jalur REJECTED, enum tidak py nilai REJECTED)", () => {
        expect(() => (0, emergency_response_plan_lifecycle_1.validateEmergencyResponsePlanStatusTransition)("UNDER_REVIEW", "DRAFT")).not.toThrow();
    });
    it("mengizinkan APPROVED_ACTIVE->SUPERSEDED dan ->ARCHIVED", () => {
        expect(() => (0, emergency_response_plan_lifecycle_1.validateEmergencyResponsePlanStatusTransition)("APPROVED_ACTIVE", "SUPERSEDED")).not.toThrow();
        expect(() => (0, emergency_response_plan_lifecycle_1.validateEmergencyResponsePlanStatusTransition)("APPROVED_ACTIVE", "ARCHIVED")).not.toThrow();
    });
    it("menolak DRAFT->APPROVED_ACTIVE langsung (lompat review)", () => {
        expect(() => (0, emergency_response_plan_lifecycle_1.validateEmergencyResponsePlanStatusTransition)("DRAFT", "APPROVED_ACTIVE")).toThrow(/tidak valid/);
    });
    it("menolak transisi dari status terminal SUPERSEDED/ARCHIVED", () => {
        expect(() => (0, emergency_response_plan_lifecycle_1.validateEmergencyResponsePlanStatusTransition)("SUPERSEDED", "DRAFT")).toThrow();
        expect(() => (0, emergency_response_plan_lifecycle_1.validateEmergencyResponsePlanStatusTransition)("ARCHIVED", "UNDER_REVIEW")).toThrow();
    });
});
describe("isPlanReviewOverdueBy30Days (BR-01)", () => {
    const now = new Date("2026-07-26T00:00:00.000Z");
    it("false kalau nextReviewDueDate null", () => {
        expect((0, emergency_response_plan_lifecycle_1.isPlanReviewOverdueBy30Days)(null, now)).toBe(false);
    });
    it("false kalau baru terlewat 10 hari (belum >30 hari)", () => {
        const due = new Date("2026-07-16T00:00:00.000Z");
        expect((0, emergency_response_plan_lifecycle_1.isPlanReviewOverdueBy30Days)(due, now)).toBe(false);
    });
    it("false tepat di batas 30 hari (harus STRICTLY lebih dari 30)", () => {
        const due = new Date("2026-06-26T00:00:00.000Z"); // tepat 30 hari
        expect((0, emergency_response_plan_lifecycle_1.isPlanReviewOverdueBy30Days)(due, now)).toBe(false);
    });
    it("true kalau terlewat 31 hari", () => {
        const due = new Date("2026-06-25T00:00:00.000Z");
        expect((0, emergency_response_plan_lifecycle_1.isPlanReviewOverdueBy30Days)(due, now)).toBe(true);
    });
    it("false kalau nextReviewDueDate di masa depan", () => {
        const due = new Date("2026-08-26T00:00:00.000Z");
        expect((0, emergency_response_plan_lifecycle_1.isPlanReviewOverdueBy30Days)(due, now)).toBe(false);
    });
});
describe("computeNextReviewDueDate", () => {
    it("ANNUAL -> +1 tahun", () => {
        const result = (0, emergency_response_plan_lifecycle_1.computeNextReviewDueDate)(new Date("2026-07-26T00:00:00.000Z"), "ANNUAL");
        expect(result.toISOString()).toBe("2027-07-26T00:00:00.000Z");
    });
    it("BIENNIAL -> +2 tahun", () => {
        const result = (0, emergency_response_plan_lifecycle_1.computeNextReviewDueDate)(new Date("2026-07-26T00:00:00.000Z"), "BIENNIAL");
        expect(result.toISOString()).toBe("2028-07-26T00:00:00.000Z");
    });
});
