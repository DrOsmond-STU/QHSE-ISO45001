export type ObligationDueScanStatus = "ACTIVE" | "INACTIVE" | "RETIRED";
export interface ObligationDueCandidate {
    obligationId: string;
    nextDueDate: Date | null;
    status: ObligationDueScanStatus;
    dueReminderSentAt: Date | null;
    overdueNotifiedAt: Date | null;
}
/**
 * PRD §8 baris 3 — "Evaluasi kepatuhan jatuh tempo -> Evaluator/PIC
 * obligation". Hanya obligation ACTIVE (INACTIVE/RETIRED tidak lagi
 * butuh evaluasi berkala). dueReminderSentAt SENGAJA TIDAK dicek terhadap
 * overdueNotifiedAt (independen) — reminder H-30 & overdue BEDA notifikasi,
 * bisa jadi due reminder sudah terkirim lalu obligation tetap tidak
 * dievaluasi sampai lewat tempo (overdue menyusul terpisah).
 */
export declare function findObligationsDueForReminder(candidates: ObligationDueCandidate[], now: Date): ObligationDueCandidate[];
/**
 * PRD §8 baris 5 — "Obligation overdue (tanpa evaluasi) -> Responsible
 * user, HSE Manager". overdueNotifiedAt jadi PENJAGA idempotency satu-
 * satunya (BEDA dari DMS review schedule yang punya status OVERDUE
 * terpisah — ObligationStatus skema §5 CUMA ACTIVE/INACTIVE/RETIRED, tidak
 * ada nilai "OVERDUE" — kolom timestamp dipilih drpd status BARU supaya
 * tidak menyimpang dari enum literal PRD, lihat banner comment kolom di
 * schema.prisma) — DI-RESET NULL oleh ComplianceEvaluationService.close()
 * (BR-06) setiap kali next_due_date pindah ke masa depan, itulah yang
 * "menyelesaikan" kondisi overdue, BUKAN scan ini sendiri.
 */
export declare function findOverdueObligations(candidates: ObligationDueCandidate[], now: Date): ObligationDueCandidate[];
