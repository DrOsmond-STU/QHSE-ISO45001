"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateHiraAssessmentStatusTransition = validateHiraAssessmentStatusTransition;
exports.anyHazardLineRequiresEscalation = anyHazardLineRequiresEscalation;
// PRD Modul 05 §5 enum "DRAFT -> IN_REVIEW -> APPROVED -> ACTIVE, atau ->
// REQUIRES_REVISION (kembali ke DRAFT), terminal ARCHIVED" — dibaca literal:
// REQUIRES_REVISION adalah status TERSENDIRI (bukan langsung overwrite jadi
// DRAFT) yang FUNGSINYA "kembali ke [siklus] DRAFT" (editable, submit ulang)
// — assessor merevisi dari REQUIRES_REVISION, submit ulang -> IN_REVIEW lagi
// (jalur SAMA dgn DRAFT->IN_REVIEW). APPROVED->ACTIVE terjadi SATU
// TRANSAKSI dgn approval final (PRD §4.1 poin 4 "Approve final -> APPROVED
// -> setelah efektif -> ACTIVE", TIDAK ADA effective_date terpisah di
// skema §5, dibaca sbg "efektif" = commit APPROVED itu sendiri) — pola
// PERSIS DocumentVersionStatus APPROVED->PUBLISHED (2.1) satu listener call.
const ALLOWED_TRANSITIONS = {
    DRAFT: ["IN_REVIEW"],
    IN_REVIEW: ["APPROVED", "REQUIRES_REVISION"],
    REQUIRES_REVISION: ["IN_REVIEW"],
    APPROVED: ["ACTIVE"],
    ACTIVE: ["ARCHIVED"],
    ARCHIVED: [],
};
function validateHiraAssessmentStatusTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi hira_assessments.status dari ${from} ke ${to} tidak valid.`);
    }
}
/**
 * PRD §4.1 poin 3 (percabangan kondisional) — "jika ada
 * hira_hazard_lines.risk_level_before = EXTREME, sistem menambahkan stage
 * Approval Top Management/Company HSE Head." Dibaca via flag TERSTRUKTUR
 * requiresEscalation (bukan string "EXTREME", lihat banner comment
 * risk_matrix_cells.requiresEscalation) diresolusi dari CELL likelihoodBefore/
 * severityBefore tiap baris (BUKAN kolom requiresEscalation TERSIMPAN di
 * hira_hazard_lines, yang merepresentasikan risk_level_AFTER — dua momen
 * BEDA, lihat banner comment kolom itu di schema.prisma) — caller
 * (HiraAssessmentService.submitForApproval()) yang melakukan lookup
 * resolveRiskScore() per baris terhadap likelihoodBefore/severityBefore
 * SEBELUM memanggil fungsi ini, murni krn nilai "before" TIDAK disimpan
 * sbg flag terpisah (cuma dibutuhkan SEKALI, saat submit, tidak perlu
 * query ulang nanti — beda dari flag "after"/residual yang genuinely
 * dipakai lagi belakangan oleh BR-06).
 */
function anyHazardLineRequiresEscalation(lines) {
    return lines.some((l) => l.requiresEscalationBefore);
}
