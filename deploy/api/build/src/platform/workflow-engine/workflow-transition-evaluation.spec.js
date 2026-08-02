"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const workflow_transition_evaluation_1 = require("./workflow-transition-evaluation");
function transition(overrides = {}) {
    return {
        id: (0, node_crypto_1.randomUUID)(),
        triggerAction: "APPROVE",
        condition: null,
        priority: 0,
        toStageId: (0, node_crypto_1.randomUUID)(),
        resultStatus: null,
        ...overrides,
    };
}
describe("pickTransition — transisi sekuensial & percabangan kondisional", () => {
    it("transisi sekuensial dasar: approve -> lanjut stage (match unconditional)", () => {
        const next = transition({ triggerAction: "APPROVE", condition: null, toStageId: "stage-2" });
        const result = (0, workflow_transition_evaluation_1.pickTransition)([next], "APPROVE", {});
        expect(result?.toStageId).toBe("stage-2");
    });
    it("transisi sekuensial dasar: reject -> berhenti (toStageId null, resultStatus REJECTED)", () => {
        const stop = transition({ triggerAction: "REJECT", condition: null, toStageId: null, resultStatus: "REJECTED" });
        const result = (0, workflow_transition_evaluation_1.pickTransition)([stop], "REJECT", {});
        expect(result?.toStageId).toBeNull();
        expect(result?.resultStatus).toBe("REJECTED");
    });
    it("percabangan kondisional: risk_level HIGH -> tambah stage approval HSE Manager", () => {
        const highRiskPath = transition({
            condition: { "==": [{ var: "risk_level" }, "HIGH"] },
            toStageId: "stage-hse-manager",
            priority: 0,
        });
        const defaultPath = transition({ condition: null, toStageId: "stage-next", priority: 10 });
        const forHigh = (0, workflow_transition_evaluation_1.pickTransition)([defaultPath, highRiskPath], "APPROVE", { risk_level: "HIGH" });
        expect(forHigh?.toStageId).toBe("stage-hse-manager");
        const forLow = (0, workflow_transition_evaluation_1.pickTransition)([defaultPath, highRiskPath], "APPROVE", { risk_level: "LOW" });
        expect(forLow?.toStageId).toBe("stage-next");
    });
    it("priority menentukan urutan evaluasi — match pertama (priority terkecil) menang", () => {
        const first = transition({ condition: { "==": [1, 1] }, toStageId: "A", priority: 0 });
        const second = transition({ condition: { "==": [1, 1] }, toStageId: "B", priority: 1 });
        const result = (0, workflow_transition_evaluation_1.pickTransition)([second, first], "APPROVE", {});
        expect(result?.toStageId).toBe("A");
    });
    it("tidak ada transisi yang cocok -> null (caller wajib error, bukan diam-diam stall)", () => {
        const onlyReject = transition({ triggerAction: "REJECT" });
        expect((0, workflow_transition_evaluation_1.pickTransition)([onlyReject], "APPROVE", {})).toBeNull();
    });
    it("triggerAction yang tidak match diabaikan meski condition-nya true", () => {
        const rejectOnly = transition({ triggerAction: "REJECT", condition: null });
        expect((0, workflow_transition_evaluation_1.pickTransition)([rejectOnly], "APPROVE", {})).toBeNull();
    });
});
describe("evaluateStageCompletion — approval paralel ALL_APPROVE vs ANY_ONE_APPROVE", () => {
    it("ALL_APPROVE: belum selesai kalau masih ada PENDING", () => {
        const result = (0, workflow_transition_evaluation_1.evaluateStageCompletion)(["APPROVED", "PENDING"], "ALL_APPROVE");
        expect(result).toEqual({ complete: false, outcome: null });
    });
    it("ALL_APPROVE: selesai (APPROVE) kalau semua APPROVED", () => {
        const result = (0, workflow_transition_evaluation_1.evaluateStageCompletion)(["APPROVED", "APPROVED"], "ALL_APPROVE");
        expect(result).toEqual({ complete: true, outcome: "APPROVE" });
    });
    it("ANY_ONE_APPROVE: selesai (APPROVE) begitu satu APPROVED, sisanya masih PENDING", () => {
        const result = (0, workflow_transition_evaluation_1.evaluateStageCompletion)(["APPROVED", "PENDING", "PENDING"], "ANY_ONE_APPROVE");
        expect(result).toEqual({ complete: true, outcome: "APPROVE" });
    });
    it("ANY_ONE_APPROVE: belum selesai kalau belum ada yang APPROVED", () => {
        const result = (0, workflow_transition_evaluation_1.evaluateStageCompletion)(["PENDING", "PENDING"], "ANY_ONE_APPROVE");
        expect(result).toEqual({ complete: false, outcome: null });
    });
    it("satu REJECTED menggagalkan stage TERLEPAS dari rule (ALL_APPROVE)", () => {
        const result = (0, workflow_transition_evaluation_1.evaluateStageCompletion)(["APPROVED", "REJECTED"], "ALL_APPROVE");
        expect(result).toEqual({ complete: true, outcome: "REJECT" });
    });
    it("satu REJECTED menggagalkan stage TERLEPAS dari rule (ANY_ONE_APPROVE)", () => {
        const result = (0, workflow_transition_evaluation_1.evaluateStageCompletion)(["APPROVED", "REJECTED", "PENDING"], "ANY_ONE_APPROVE");
        expect(result).toEqual({ complete: true, outcome: "REJECT" });
    });
    it("stage non-paralel (1 task): APPROVED -> selesai, PENDING -> belum", () => {
        expect((0, workflow_transition_evaluation_1.evaluateStageCompletion)(["APPROVED"], "ALL_APPROVE")).toEqual({ complete: true, outcome: "APPROVE" });
        expect((0, workflow_transition_evaluation_1.evaluateStageCompletion)(["PENDING"], "ALL_APPROVE")).toEqual({ complete: false, outcome: null });
    });
});
