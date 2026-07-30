import { WorkflowInstanceStatus, WorkflowParallelCompletionRule, WorkflowTaskAction, WorkflowTaskStatus } from "@prisma/client";
import { evaluateCondition } from "./json-logic.evaluator";

// Pure logic — tanpa Prisma/DB, mirror gaya lockout.service.ts /
// permission-resolution.ts. Caller (WorkflowEngineService) yang baca state
// dari DB dan panggil fungsi-fungsi ini.

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
export function pickTransition(
  candidates: TransitionCandidate[],
  triggerAction: WorkflowTaskAction,
  contextData: Record<string, unknown>,
): TransitionCandidate | null {
  const sorted = candidates
    .filter((c) => c.triggerAction === triggerAction)
    .sort((a, b) => a.priority - b.priority);

  for (const candidate of sorted) {
    if (evaluateCondition(candidate.condition, contextData)) {
      return candidate;
    }
  }
  return null;
}

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
export function evaluateStageCompletion(
  taskStatuses: WorkflowTaskStatus[],
  rule: WorkflowParallelCompletionRule,
): StageCompletionResult {
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
