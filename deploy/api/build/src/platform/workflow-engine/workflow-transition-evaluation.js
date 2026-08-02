"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickTransition = pickTransition;
exports.evaluateStageCompletion = evaluateStageCompletion;
const json_logic_evaluator_1 = require("./json-logic.evaluator");
/**
 * TDD §9 — kondisi transisi dievaluasi JSON Logic, percabangan kondisional.
 * Filter by triggerAction dulu, lalu condition (JSON Logic) yang match,
 * urut priority ASC (lebih kecil dievaluasi duluan), match PERTAMA menang.
 */
function pickTransition(candidates, triggerAction, contextData) {
    const sorted = candidates
        .filter((c) => c.triggerAction === triggerAction)
        .sort((a, b) => a.priority - b.priority);
    for (const candidate of sorted) {
        if ((0, json_logic_evaluator_1.evaluateCondition)(candidate.condition, contextData)) {
            return candidate;
        }
    }
    return null;
}
/**
 * TDD §9 — approval paralel: satu stage bisa hasilkan banyak task sekaligus,
 * selesai berdasarkan ALL_APPROVE atau ANY_ONE_APPROVE. Satu REJECT di
 * manapun langsung gagalkan stage TERLEPAS dari rule (approval paralel tidak
 * pernah "menang" lewat REJECT anggota lain — prinsip fail-closed yang sama
 * dipakai RBAC/lockout). Berlaku juga untuk stage non-paralel (list 1 task).
 */
function evaluateStageCompletion(taskStatuses, rule) {
    if (taskStatuses.some((s) => s === "REJECTED")) {
        return { complete: true, outcome: "REJECT" };
    }
    if (rule === "ANY_ONE_APPROVE") {
        if (taskStatuses.some((s) => s === "APPROVED")) {
            return { complete: true, outcome: "APPROVE" };
        }
        return { complete: false, outcome: null };
    }
    // ALL_APPROVE (default)
    if (taskStatuses.length > 0 && taskStatuses.every((s) => s === "APPROVED")) {
        return { complete: true, outcome: "APPROVE" };
    }
    return { complete: false, outcome: null };
}
