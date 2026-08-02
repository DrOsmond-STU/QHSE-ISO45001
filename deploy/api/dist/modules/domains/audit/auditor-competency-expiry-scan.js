"use strict";
// Pure logic — mirror license-expiry-scan.ts (2.2) pattern: caller
// (AuditorCompetencyExpiryScanService) baca kandidat dari DB, panggil
// fungsi ini, caller yang tulis hasilnya. Tidak ada Prisma/BullMQ di sini.
Object.defineProperty(exports, "__esModule", { value: true });
exports.findExpiredCompetencyRecords = findExpiredCompetencyRecords;
exports.findCompetencyRecordsApproachingExpiry = findCompetencyRecordsApproachingExpiry;
// PRD §8 "Kompetensi auditor akan kedaluwarsa" mengimplikasikan status
// genuinely berubah begitu lewat expiry_date — PRD §6 TIDAK beri BR
// bernomor eksplisit utk transisi ini (beda dari License BR-02 literal),
// didekati pola sama "auto-expire" modul lain (HIRADC/License).
function findExpiredCompetencyRecords(candidates, now) {
    return candidates.filter((c) => c.status === "ACTIVE" && c.expiryDate !== null && c.expiryDate.getTime() < now.getTime());
}
// PRD §8 "Kompetensi auditor akan kedaluwarsa" — TIDAK ADA ambang H-N
// eksplisit maupun kolom idempotency (beda dari License H-90/H-30/H-7) —
// didekati SATU jendela 30 hari flat + "daily nag" (pola sama Emergency
// Response plan-review-overdue-scan 3.7/Inspection finding-sla-scan 3.6):
// record yang sama dinotifikasi ULANG SETIAP HARI scan berjalan selama
// masih dalam jendela DAN masih ACTIVE — TIDAK ADA kolom idempotency,
// gap TDD §26.
const EXPIRY_WARNING_WINDOW_DAYS = 30;
function findCompetencyRecordsApproachingExpiry(candidates, now) {
    const windowMs = EXPIRY_WARNING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return candidates.filter((c) => {
        if (c.status !== "ACTIVE" || c.expiryDate === null)
            return false;
        const msUntilExpiry = c.expiryDate.getTime() - now.getTime();
        return msUntilExpiry >= 0 && msUntilExpiry <= windowMs;
    });
}
//# sourceMappingURL=auditor-competency-expiry-scan.js.map