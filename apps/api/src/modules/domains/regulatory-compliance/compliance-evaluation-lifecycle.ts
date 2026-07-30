import { ComplianceEvaluationStatus, ComplianceStatus, ObligationFrequency } from "@prisma/client";

// PRD Modul 04 §4.2: "DRAFT -> submit -> SUBMITTED -> (Workflow Engine 1
// stage Review HSE Manager) -> REVIEWED -> CLOSED (BR-03 gate)". Enum tidak
// punya nilai REJECTED (beda dari DocumentVersionStatus 2.1) — penolakan
// workflow mengembalikan evaluasi ke DRAFT utk direvisi & disubmit ulang,
// pola sama document-version-lifecycle.ts (2.1) tapi tanpa status terminal
// terpisah krn skema literal PRD §5 tidak menyediakannya.
const ALLOWED_TRANSITIONS: Record<ComplianceEvaluationStatus, ComplianceEvaluationStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["REVIEWED", "DRAFT"],
  REVIEWED: ["CLOSED"],
  CLOSED: [],
};

export function validateComplianceEvaluationStatusTransition(from: ComplianceEvaluationStatus, to: ComplianceEvaluationStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi compliance_evaluations.status dari ${from} ke ${to} tidak valid.`);
  }
}

// BR-03 (PRD §6): "compliance_evaluations dengan compliance_status ∈
// {NON_COMPLIANT, PARTIALLY_COMPLIANT} wajib memiliki minimal satu CAPA
// tertaut (linked_capa_id terisi) sebelum status dapat diubah menjadi
// CLOSED." linked_capa_id bare UUID (Modul 10 CAPA belum ada, TDD §26 —
// tidak divalidasi eksistensinya di sini, hanya "terisi/tidak").
export function assertCanCloseEvaluation(complianceStatus: ComplianceStatus, linkedCapaId: string | null): void {
  const requiresCapa = complianceStatus === "NON_COMPLIANT" || complianceStatus === "PARTIALLY_COMPLIANT";
  if (requiresCapa && linkedCapaId === null) {
    throw new Error(
      `compliance_evaluations dengan compliance_status=${complianceStatus} wajib memiliki linked_capa_id sebelum status CLOSED (BR-03).`,
    );
  }
}

// BR-06 (PRD §6): "compliance_obligations.next_due_date dihitung ulang
// otomatis setiap kali evaluasi terkait berstatus CLOSED, berdasarkan
// frequency." ONE_TIME/AS_NEEDED tidak punya siklus tetap → null (tidak
// dijadwalkan ulang), sama seperti MINOR/MAJOR_REVISION documentReviewSchedule
// (2.1) yang sengaja TIDAK auto-schedule next cycle. Aritmatika bulan pakai
// setUTCMonth() mentah TANPA clamping akhir-bulan — pola PERSIS
// document-review-schedule.service.ts (2.1)/document-workflow-completion.listener.ts
// (2.1), bukan addMonthsUtc() (audit-log-partition.ts, 0.13) yang selalu
// clamp ke tanggal 1 (dirancang utk partition boundary, bukan next-due-date
// yang harus pertahankan hari-dalam-bulan).
export function computeNextObligationDueDate(closedAt: Date, frequency: ObligationFrequency): Date | null {
  const monthsByFrequency: Partial<Record<ObligationFrequency, number>> = {
    MONTHLY: 1,
    QUARTERLY: 3,
    SEMI_ANNUAL: 6,
    ANNUAL: 12,
  };
  const months = monthsByFrequency[frequency];
  if (months === undefined) return null;
  const next = new Date(closedAt);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}
