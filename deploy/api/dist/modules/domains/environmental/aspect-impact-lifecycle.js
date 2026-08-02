"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSignificanceScore = calculateSignificanceScore;
exports.deriveSignificanceLevel = deriveSignificanceLevel;
exports.assertControlsAdequateForActive = assertControlsAdequateForActive;
exports.validateAspectImpactStatusTransition = validateAspectImpactStatusTransition;
// PRD §4.1 poin 2 — "Sistem menghitung significance_score (agregasi
// terbobot, bobot configurable per tenant)". PRD tidak beri formula/bobot
// default eksplisit — diinterpretasikan RATA-RATA TERBOBOT lima skor
// (likelihood/severity/frequency/regulatory/stakeholder_concern) dengan
// bobot default SAMA RATA (0.2 masing²) kalau tenant tidak override
// scoringWeightDetail, gap TDD §26 (pola sama default 5x5 risk matrix 3.1).
const SCORE_KEYS = ["likelihood", "severity", "frequency", "regulatory", "stakeholderConcern"];
function calculateSignificanceScore(scores, weights) {
    const w = {
        likelihood: weights?.likelihood ?? 0.2,
        severity: weights?.severity ?? 0.2,
        frequency: weights?.frequency ?? 0.2,
        regulatory: weights?.regulatory ?? 0.2,
        stakeholderConcern: weights?.stakeholderConcern ?? 0.2,
    };
    const totalWeight = SCORE_KEYS.reduce((sum, k) => sum + w[k], 0);
    if (Math.abs(totalWeight - 1) > 0.001) {
        throw new Error(`Total bobot scoring_weight_detail harus 1.0 (didapat ${totalWeight}).`);
    }
    const raw = scores.likelihoodScore * w.likelihood +
        scores.severityScore * w.severity +
        scores.frequencyScore * w.frequency +
        scores.regulatoryScore * w.regulatory +
        scores.stakeholderConcernScore * w.stakeholderConcern;
    return Math.round(raw * 100) / 100;
}
function deriveSignificanceLevel(significanceScore, threshold) {
    return significanceScore >= threshold ? "SIGNIFICANT" : "NOT_SIGNIFICANT";
}
// BR-01 — "environmental_aspects_impacts dengan significance_level=SIGNIFICANT
// wajib memiliki existing_controls terverifikasi dan/atau capa_id terisi
// sebelum status ACTIVE."
function assertControlsAdequateForActive(significanceLevel, existingControls, capaRegisterId) {
    if (significanceLevel === "SIGNIFICANT" && !existingControls && !capaRegisterId) {
        throw new Error("environmental_aspects_impacts significance_level=SIGNIFICANT wajib existing_controls terisi dan/atau capa_id sebelum status ACTIVE (BR-01).");
    }
}
// PRD §4.1 — DRAFT(1)->skor diisi->submit review(2)->HSE Manager
// approval(4)->ACTIVE. Review tahunan (poin 5) siklus ACTIVE<->UNDER_REVIEW.
const ALLOWED_TRANSITIONS = {
    DRAFT: ["UNDER_REVIEW"],
    UNDER_REVIEW: ["ACTIVE", "DRAFT"],
    ACTIVE: ["UNDER_REVIEW", "ARCHIVED"],
    ARCHIVED: [],
};
function validateAspectImpactStatusTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi environmental_aspects_impacts.status dari ${from} ke ${to} tidak valid.`);
    }
}
//# sourceMappingURL=aspect-impact-lifecycle.js.map