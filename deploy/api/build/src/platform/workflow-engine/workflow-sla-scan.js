"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOverdueTasks = findOverdueTasks;
exports.decideEscalation = decideEscalation;
/**
 * TDD §9 — job workflow-sla-scan mem-scan task PENDING yang melewati
 * sla_hours. Natural-key idempotency (TDD §13.2): escalatedAt bukan NULL =
 * sudah pernah dieskalasi, PERMANEN dikecualikan dari scan berikutnya
 * berapa kali pun job jalan/retry.
 */
function findOverdueTasks(candidates, now) {
    return candidates.filter((c) => {
        if (c.escalatedAt !== null)
            return false;
        if (c.escalationAction === "NONE")
            return false;
        const deadline = c.createdAt.getTime() + c.slaHours * 60 * 60 * 1000;
        return deadline < now.getTime();
    });
}
/**
 * NOTIFY_SUPERIOR -> hanya notifikasi (event, konsumen 0.11 nanti), tidak
 * reassign. AUTO_ESCALATE -> reassign ke escalationRoleId KALAU di-set;
 * kalau kosong, graceful degrade (notifikasi tetap jalan, reassign tidak) —
 * BUKAN silent no-op, tetap emit event.
 */
function decideEscalation(task) {
    return {
        taskId: task.taskId,
        action: task.escalationAction,
        reassignToRoleId: task.escalationAction === "AUTO_ESCALATE" ? task.escalationRoleId : null,
    };
}
