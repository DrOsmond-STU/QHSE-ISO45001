// BR-06 (PRD Modul 08 §6) literal — "inspection_schedules yang
// next_generation_date terlewati TANPA inspection_records terkait
// berstatus COMPLETED ditandai jadwal OVERDUE." `inspection_schedules`
// TIDAK punya kolom status apa pun di skema §5 literal (hanya is_active
// BOOLEAN) — TIDAK ADA tempat menyimpan "jadwal OVERDUE" di level jadwal.
// Dibaca ulang di level RECORD (bukan schedule): baris inspection_records
// yang SUDAH digenerate (status SCHEDULED/IN_PROGRESS) dgn planned_date
// terlampaui ditandai status=OVERDUE — memakai nilai enum
// InspectionRecordStatus.OVERDUE yang MEMANG SUDAH ADA di skema, TANPA
// perlu kolom baru. Gap/interpretasi didokumentasikan TDD §26.
export interface RecordOverdueCandidate {
  recordId: string;
  plannedDate: Date | null;
}

export function findOverdueInspectionRecords(candidates: RecordOverdueCandidate[], now: Date): RecordOverdueCandidate[] {
  return candidates.filter((c) => c.plannedDate !== null && c.plannedDate.getTime() < now.getTime());
}
