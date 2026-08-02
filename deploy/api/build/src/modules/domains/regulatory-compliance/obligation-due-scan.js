"use strict";
// Pure logic — mirror review-schedule-scan.ts (2.1)/license-expiry-scan.ts
// (2.2) pattern. Merealisasikan PRD §8 baris 3 ("Evaluasi kepatuhan jatuh
// tempo -> Evaluator/PIC obligation") dan baris 5 ("Obligation overdue
// (tanpa evaluasi) -> Responsible user, HSE Manager"), keduanya berbasis
// compliance_obligations.next_due_date (BR-06 yang menghitungnya ulang).
Object.defineProperty(exports, "__esModule", { value: true });
exports.findObligationsDueForReminder = findObligationsDueForReminder;
exports.findOverdueObligations = findOverdueObligations;
// PRD §8 tidak memberi angka lead-time eksplisit utk "jatuh tempo" (beda
// dari licenses_permits yang literal H-90/H-30/H-7) — H-30 dipilih sbg
// default tunggal, pola sama REVIEW_REMINDER_LEAD_DAYS (document-review-schedule,
// 2.1), keputusan interpretatif (gap TDD §26).
const OBLIGATION_DUE_REMINDER_LEAD_DAYS = 30;
function daysBetween(a, b) {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    return Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY);
}
/**
 * PRD §8 baris 3 — "Evaluasi kepatuhan jatuh tempo -> Evaluator/PIC
 * obligation". Hanya obligation ACTIVE (INACTIVE/RETIRED tidak lagi
 * butuh evaluasi berkala). dueReminderSentAt SENGAJA TIDAK dicek terhadap
 * overdueNotifiedAt (independen) — reminder H-30 & overdue BEDA notifikasi,
 * bisa jadi due reminder sudah terkirim lalu obligation tetap tidak
 * dievaluasi sampai lewat tempo (overdue menyusul terpisah).
 */
function findObligationsDueForReminder(candidates, now) {
    return candidates.filter((c) => {
        if (c.status !== "ACTIVE")
            return false;
        if (c.nextDueDate === null)
            return false;
        if (c.dueReminderSentAt !== null)
            return false;
        return daysBetween(c.nextDueDate, now) <= OBLIGATION_DUE_REMINDER_LEAD_DAYS;
    });
}
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
function findOverdueObligations(candidates, now) {
    return candidates.filter((c) => {
        if (c.status !== "ACTIVE")
            return false;
        if (c.nextDueDate === null)
            return false;
        if (c.overdueNotifiedAt !== null)
            return false;
        return daysBetween(now, c.nextDueDate) > 0;
    });
}
