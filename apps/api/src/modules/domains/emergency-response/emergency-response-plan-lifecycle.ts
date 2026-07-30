import { EmergencyPlanReviewFrequency, EmergencyPlanStatus } from "@prisma/client";

// PRD Modul 14 §5 enum literal TANPA tabel transisi eksplisit — pola sama
// seluruh modul lain. UNDER_REVIEW->DRAFT = jalur REJECTED (enum tidak py
// nilai "REJECTED"/"RETURNED" spt Incident 3.5 — resubmission mendarat di
// DRAFT yang sama, workflow_instance_id di-null-kan oleh listener, pola
// sama JSA 3.2). APPROVED_ACTIVE->UNDER_REVIEW = re-review MANUAL (siklus
// tahunan BR-01 murni notifikasi/reminder, TIDAK memaksa transisi status
// otomatis — HSE Officer/Manager yang memutuskan submit ulang).
const ALLOWED_TRANSITIONS: Record<EmergencyPlanStatus, EmergencyPlanStatus[]> = {
  DRAFT: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["APPROVED_ACTIVE", "DRAFT"],
  APPROVED_ACTIVE: ["UNDER_REVIEW", "SUPERSEDED", "ARCHIVED"],
  SUPERSEDED: [],
  ARCHIVED: [],
};

export function validateEmergencyResponsePlanStatusTransition(from: EmergencyPlanStatus, to: EmergencyPlanStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi emergency_response_plans.status dari ${from} ke ${to} tidak valid.`);
  }
}

// BR-01 — "status ditandai terlambat (flag dashboard) jika
// next_review_due_date terlewati > 30 hari, memicu notifikasi eskalasi ke
// HSE Manager." Ambang 30 hari LITERAL PRD (beda dari #generic-N-hari
// module lain yang sering harus diasumsikan) — flag murni "lebih dari 30
// hari SETELAH lewat jatuh tempo", BUKAN begitu tanggal terlewati (baru
// beberapa hari overdue TIDAK memicu ini, meski scara teknis sudah lewat
// tanggal).
export function isPlanReviewOverdueBy30Days(nextReviewDueDate: Date | null, now: Date): boolean {
  if (!nextReviewDueDate) return false;
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  return now.getTime() - nextReviewDueDate.getTime() > THIRTY_DAYS_MS;
}

// PRD §5 "review_frequency ENUM ANNUAL/BIENNIAL default ANNUAL" +
// "last_reviewed_date"/"next_review_due_date" — PRD tidak eja literal
// KAPAN next_review_due_date pertama kali dihitung; dibaca sbg "begitu
// plan APPROVED_ACTIVE, hitung dari effective_date (atau saat itu kalau
// effective_date belum diisi)" — pola aritmatika kalender native Date
// (UTC), konsisten computeNextGenerationDate (Inspection 3.6).
export function computeNextReviewDueDate(fromDate: Date, frequency: EmergencyPlanReviewFrequency): Date {
  const next = new Date(fromDate);
  const yearsToAdd = frequency === "BIENNIAL" ? 2 : 1;
  next.setUTCFullYear(next.getUTCFullYear() + yearsToAdd);
  return next;
}
