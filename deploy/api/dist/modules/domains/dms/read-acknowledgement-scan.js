"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOverdueAcknowledgements = findOverdueAcknowledgements;
/**
 * BR-04 (PRD §6) — "Melewati acknowledgement_due_days tanpa acknowledge ->
 * status -> OVERDUE, eskalasi notifikasi ke user & atasannya." Hanya
 * PENDING/VIEWED yang relevan (ACKNOWLEDGED sudah selesai, OVERDUE sudah
 * pernah diproses — idempotensi natural-key via status itu sendiri,
 * dieksklusi query kandidat caller, pola sama findOverdueTasks 0.9 yang
 * juga menerima kandidat SUDAH difilter PENDING).
 */
function findOverdueAcknowledgements(candidates, now) {
    return candidates.filter((c) => c.dueAt !== null && c.dueAt.getTime() < now.getTime());
}
//# sourceMappingURL=read-acknowledgement-scan.js.map