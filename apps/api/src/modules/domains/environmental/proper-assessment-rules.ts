import { EnvProperRating, EnvProperSubmissionStatus } from "@prisma/client";

export interface CriteriaScoreInput {
  scoreValue: number;
  weightPercentage: number;
}

// PRD §4.4 poin 3 — "Sistem menghitung overall_predicted_rating dari
// agregasi terbobot skor kriteria." Skala score_value/weight_percentage
// (NUMERIC(5,2), §5) diinterpretasikan 0-100 (PRD tidak beri skala
// eksplisit), gap TDD §26.
export function calculateComplianceScorePercentage(scores: CriteriaScoreInput[]): number {
  if (scores.length === 0) return 0;
  const totalWeight = scores.reduce((sum, s) => sum + s.weightPercentage, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = scores.reduce((sum, s) => sum + s.scoreValue * s.weightPercentage, 0);
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

// PRD §5 rating literal Hitam-Merah-Biru-Hijau-Emas (PROPER KLHK resmi,
// urutan terburuk->terbaik). Ambang persentase PER PITA SEPENUHNYA
// DIKARANG (PRD tidak beri angka) — pita rata 5x20% dipilih sbg
// interpretasi paling netral, pola sama seluruh ambang invented
// sepanjang session (mis. band risk matrix default 3.1), gap TDD §26.
export function deriveProperRating(complianceScorePercentage: number): EnvProperRating {
  if (complianceScorePercentage < 20) return "HITAM";
  if (complianceScorePercentage < 40) return "MERAH";
  if (complianceScorePercentage < 60) return "BIRU";
  if (complianceScorePercentage < 80) return "HIJAU";
  return "EMAS";
}

// BR-06 — "override manual oleh HSE Manager wajib mengisi
// override_justification."
export function assertOverrideJustificationRequired(isOverride: boolean, overrideJustification: string | null): void {
  if (isOverride && !overrideJustification) {
    throw new Error("proper_self_assessment override_justification wajib diisi jika overall_predicted_rating di-override manual (BR-06).");
  }
}

// PRD §4.4 — header dibuat(DRAFT)->kriteria diisi->Review HSE Manager
// (INTERNAL_REVIEWED)->Approval Top Management->SUBMITTED_TO_KLHK->hasil
// resmi dicatat->RESULT_RECEIVED.
const ALLOWED_TRANSITIONS: Record<EnvProperSubmissionStatus, EnvProperSubmissionStatus[]> = {
  DRAFT: ["INTERNAL_REVIEWED"],
  INTERNAL_REVIEWED: ["SUBMITTED_TO_KLHK", "DRAFT"],
  SUBMITTED_TO_KLHK: ["RESULT_RECEIVED"],
  RESULT_RECEIVED: [],
};

export function validateProperSubmissionStatusTransition(from: EnvProperSubmissionStatus, to: EnvProperSubmissionStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi proper_self_assessment.submission_status dari ${from} ke ${to} tidak valid.`);
  }
}
