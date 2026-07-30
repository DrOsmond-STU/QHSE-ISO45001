import { WorkflowEscalationAction } from "@prisma/client";

// Pure logic — mirror lockout.service.ts: caller (WorkflowSlaScanService)
// baca kandidat dari DB, panggil fungsi ini, lalu caller yang tulis
// hasilnya. Tidak ada Prisma/BullMQ di sini sama sekali.

export interface OverdueTaskCandidate {
  taskId: string;
  createdAt: Date;
  escalatedAt: Date | null;
  slaHours: number;
  escalationAction: WorkflowEscalationAction;
  escalationRoleId: string | null;
}

/**
 * TDD §9 — job workflow-sla-scan mem-scan task PENDING yang melewati
 * sla_hours. Natural-key idempotency (TDD §13.2): escalatedAt bukan NULL =
 * sudah pernah dieskalasi, PERMANEN dikecualikan dari scan berikutnya
 * berapa kali pun job jalan/retry.
 */
export function findOverdueTasks(candidates: OverdueTaskCandidate[], now: Date): OverdueTaskCandidate[] {
  return candidates.filter((c) => {
    if (c.escalatedAt !== null) return false;
    if (c.escalationAction === "NONE") return false;
    const deadline = c.createdAt.getTime() + c.slaHours * 60 * 60 * 1000;
    return deadline < now.getTime();
  });
}

export interface EscalationDecision {
  taskId: string;
  action: WorkflowEscalationAction;
  reassignToRoleId: string | null;
}

/**
 * NOTIFY_SUPERIOR -> hanya notifikasi (event, konsumen 0.11 nanti), tidak
 * reassign. AUTO_ESCALATE -> reassign ke escalationRoleId KALAU di-set;
 * kalau kosong, graceful degrade (notifikasi tetap jalan, reassign tidak) —
 * BUKAN silent no-op, tetap emit event.
 */
export function decideEscalation(task: OverdueTaskCandidate): EscalationDecision {
  return {
    taskId: task.taskId,
    action: task.escalationAction,
    reassignToRoleId: task.escalationAction === "AUTO_ESCALATE" ? task.escalationRoleId : null,
  };
}
