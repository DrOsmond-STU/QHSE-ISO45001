"use strict";
// Pure logic — mirror audit-finding-closure-due-scan.ts (4.1) pattern.
Object.defineProperty(exports, "__esModule", { value: true });
exports.findCapaRootCauseSlaDue = findCapaRootCauseSlaDue;
// PRD §8 "Root cause belum diisi mendekati SLA" — TIDAK ADA ambang N hari
// eksplisit di PRD manapun (BEDA dari stage APPROVAL 3/3/5 hari kerja §5
// yang SUDAH konkret) — didekati 7 hari KALENDER sejak initiated_at,
// invented, gap TDD §26 (pola sama CLOSURE_DUE_WARNING_WINDOW_DAYS 4.1).
// "belum diisi" == capa_register.status masih DRAFT (root cause PERTAMA
// yang direkam otomatis memindahkan status ke ROOT_CAUSE_ANALYSIS — lihat
// CapaRegisterService.markRootCauseAnalysisStarted() — jadi DRAFT persis
// mewakili "belum ada root cause sama sekali", TIDAK perlu query terpisah
// ke tabel capa_root_cause_analysis).
const ROOT_CAUSE_SLA_WARNING_DAYS = 7;
function findCapaRootCauseSlaDue(candidates, now) {
    const windowMs = ROOT_CAUSE_SLA_WARNING_DAYS * 24 * 60 * 60 * 1000;
    return candidates.filter((c) => {
        if (c.status !== "DRAFT" || c.rootCauseSlaReminderSentAt !== null)
            return false;
        return now.getTime() - c.initiatedAt.getTime() >= windowMs;
    });
}
