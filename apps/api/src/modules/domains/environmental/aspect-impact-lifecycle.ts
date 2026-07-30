import { EnvAspectImpactStatus, EnvSignificanceLevel } from "@prisma/client";

// PRD §4.1 poin 2 — "Sistem menghitung significance_score (agregasi
// terbobot, bobot configurable per tenant)". PRD tidak beri formula/bobot
// default eksplisit — diinterpretasikan RATA-RATA TERBOBOT lima skor
// (likelihood/severity/frequency/regulatory/stakeholder_concern) dengan
// bobot default SAMA RATA (0.2 masing²) kalau tenant tidak override
// scoringWeightDetail, gap TDD §26 (pola sama default 5x5 risk matrix 3.1).
const SCORE_KEYS = ["likelihood", "severity", "frequency", "regulatory", "stakeholderConcern"] as const;
type ScoreKey = (typeof SCORE_KEYS)[number];

export interface AspectImpactScores {
  likelihoodScore: number;
  severityScore: number;
  frequencyScore: number;
  regulatoryScore: number;
  stakeholderConcernScore: number;
}

export function calculateSignificanceScore(scores: AspectImpactScores, weights?: Partial<Record<ScoreKey, number>>): number {
  const w: Record<ScoreKey, number> = {
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
  const raw =
    scores.likelihoodScore * w.likelihood +
    scores.severityScore * w.severity +
    scores.frequencyScore * w.frequency +
    scores.regulatoryScore * w.regulatory +
    scores.stakeholderConcernScore * w.stakeholderConcern;
  return Math.round(raw * 100) / 100;
}

export function deriveSignificanceLevel(significanceScore: number, threshold: number): EnvSignificanceLevel {
  return significanceScore >= threshold ? "SIGNIFICANT" : "NOT_SIGNIFICANT";
}

// BR-01 — "environmental_aspects_impacts dengan significance_level=SIGNIFICANT
// wajib memiliki existing_controls terverifikasi dan/atau capa_id terisi
// sebelum status ACTIVE."
export function assertControlsAdequateForActive(
  significanceLevel: EnvSignificanceLevel,
  existingControls: string | null,
  capaRegisterId: string | null,
): void {
  if (significanceLevel === "SIGNIFICANT" && !existingControls && !capaRegisterId) {
    throw new Error(
      "environmental_aspects_impacts significance_level=SIGNIFICANT wajib existing_controls terisi dan/atau capa_id sebelum status ACTIVE (BR-01).",
    );
  }
}

// PRD §4.1 — DRAFT(1)->skor diisi->submit review(2)->HSE Manager
// approval(4)->ACTIVE. Review tahunan (poin 5) siklus ACTIVE<->UNDER_REVIEW.
const ALLOWED_TRANSITIONS: Record<EnvAspectImpactStatus, EnvAspectImpactStatus[]> = {
  DRAFT: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["ACTIVE", "DRAFT"],
  ACTIVE: ["UNDER_REVIEW", "ARCHIVED"],
  ARCHIVED: [],
};

export function validateAspectImpactStatusTransition(from: EnvAspectImpactStatus, to: EnvAspectImpactStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi environmental_aspects_impacts.status dari ${from} ke ${to} tidak valid.`);
  }
}
