import { WorkflowEscalationAction } from "@prisma/client";
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
export declare function findOverdueTasks(candidates: OverdueTaskCandidate[], now: Date): OverdueTaskCandidate[];
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
export declare function decideEscalation(task: OverdueTaskCandidate): EscalationDecision;
