import { WorkflowInstanceStatus, WorkflowParallelCompletionRule, WorkflowTaskAction, WorkflowTaskStatus } from "@prisma/client";
export interface TransitionCandidate {
    id: string;
    triggerAction: WorkflowTaskAction;
    condition: unknown;
    priority: number;
    toStageId: string | null;
    resultStatus: WorkflowInstanceStatus | null;
}
/**
 * TDD §9 — kondisi transisi dievaluasi JSON Logic, percabangan kondisional.
 * Filter by triggerAction dulu, lalu condition (JSON Logic) yang match,
 * urut priority ASC (lebih kecil dievaluasi duluan), match PERTAMA menang.
 */
export declare function pickTransition(candidates: TransitionCandidate[], triggerAction: WorkflowTaskAction, contextData: Record<string, unknown>): TransitionCandidate | null;
export interface StageCompletionResult {
    complete: boolean;
    outcome: "APPROVE" | "REJECT" | null;
}
/**
 * TDD §9 — approval paralel: satu stage bisa hasilkan banyak task sekaligus,
 * selesai berdasarkan ALL_APPROVE atau ANY_ONE_APPROVE. Satu REJECT di
 * manapun langsung gagalkan stage TERLEPAS dari rule (approval paralel tidak
 * pernah "menang" lewat REJECT anggota lain — prinsip fail-closed yang sama
 * dipakai RBAC/lockout). Berlaku juga untuk stage non-paralel (list 1 task).
 */
export declare function evaluateStageCompletion(taskStatuses: WorkflowTaskStatus[], rule: WorkflowParallelCompletionRule): StageCompletionResult;
