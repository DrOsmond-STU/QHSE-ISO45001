import { ReadAcknowledgementStatus } from "@prisma/client";

// Pure logic — mirror workflow-sla-scan.ts (0.9) pattern.

export interface AcknowledgementOverdueCandidate {
  ackLogId: string;
  status: ReadAcknowledgementStatus;
  // Due date dihitung dari PARENT document_distribution (distributedAt +
  // acknowledgementDueDays), BUKAN dari baris read_acknowledgement_logs
  // sendiri (PRD §5 — kolom itu cuma ada di document_distribution).
  // NULL = requiresAcknowledgement:false ATAU acknowledgementDueDays tidak
  // diisi (SLA opsional per PRD, "acknowledgement_due_days INT NULL") —
  // tidak pernah overdue.
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
export function findOverdueAcknowledgements(
  candidates: AcknowledgementOverdueCandidate[],
  now: Date,
): AcknowledgementOverdueCandidate[] {
  return candidates.filter((c) => c.dueAt !== null && c.dueAt.getTime() < now.getTime());
}
