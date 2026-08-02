import { HiraAssessmentStatus } from "@prisma/client";
export declare function validateHiraAssessmentStatusTransition(from: HiraAssessmentStatus, to: HiraAssessmentStatus): void;
export interface HiraHazardLineEscalationCandidate {
    requiresEscalationBefore: boolean;
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
export declare function anyHazardLineRequiresEscalation(lines: HiraHazardLineEscalationCandidate[]): boolean;
