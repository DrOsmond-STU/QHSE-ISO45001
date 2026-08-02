import { ReadAcknowledgementStatus } from "@prisma/client";
export interface AcknowledgementOverdueCandidate {
    ackLogId: string;
    status: ReadAcknowledgementStatus;
    dueAt: Date | null;
}
/**
 * BR-04 (PRD §6) — "Melewati acknowledgement_due_days tanpa acknowledge ->
 * status -> OVERDUE, eskalasi notifikasi ke user & atasannya." Hanya
 * PENDING/VIEWED yang relevan (ACKNOWLEDGED sudah selesai, OVERDUE sudah
 * pernah diproses — idempotensi natural-key via status itu sendiri,
 * dieksklusi query kandidat caller, pola sama findOverdueTasks 0.9 yang
 * juga menerima kandidat SUDAH difilter PENDING).
 */
export declare function findOverdueAcknowledgements(candidates: AcknowledgementOverdueCandidate[], now: Date): AcknowledgementOverdueCandidate[];
