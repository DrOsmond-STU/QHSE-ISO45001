import { QualityComplaintSeverity, QualityComplaintStatus } from "@prisma/client";

// PRD Modul 11 §5 ERD + §4.2 alur — RECEIVED->UNDER_INVESTIGATION->
// CAPA_IN_PROGRESS->RESOLVED->CLOSED, atau REJECTED_INVALID dari status
// non-terminal manapun (komplain ternyata tidak valid).
const ALLOWED_TRANSITIONS: Record<QualityComplaintStatus, QualityComplaintStatus[]> = {
  RECEIVED: ["UNDER_INVESTIGATION", "REJECTED_INVALID"],
  UNDER_INVESTIGATION: ["CAPA_IN_PROGRESS", "RESOLVED", "REJECTED_INVALID"],
  CAPA_IN_PROGRESS: ["RESOLVED", "REJECTED_INVALID"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
  REJECTED_INVALID: [],
};

export function validateComplaintStatusTransition(from: QualityComplaintStatus, to: QualityComplaintStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi customer_complaints.status dari ${from} ke ${to} tidak valid.`);
  }
}

// BR-01-analog (§4.2 poin 3) — "root cause & tindakan perbaikan WAJIB
// capa_id terisi utk complaint kategori HIGH/CRITICAL."
export function assertCapaRequiredForCategory(severity: QualityComplaintSeverity, capaRegisterId: string | null): void {
  if ((severity === "HIGH" || severity === "CRITICAL") && !capaRegisterId) {
    throw new Error(`customer_complaints severity=${severity} tidak dapat masuk CAPA_IN_PROGRESS tanpa capa_id terisi.`);
  }
}

// BR-02 — "customer_complaints wajib direspon awal ke pelanggan sesuai SLA
// tenant (default 2x24 jam); pelanggaran SLA memicu notifikasi eskalasi."
export function isInitialResponseOverdue(dueDate: Date, sentAt: Date | null, now: Date): boolean {
  if (sentAt !== null) return false;
  return now.getTime() > dueDate.getTime();
}
