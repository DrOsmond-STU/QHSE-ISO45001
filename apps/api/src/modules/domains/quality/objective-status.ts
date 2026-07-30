import { QualityObjectiveStatus } from "@prisma/client";

// BR-05 — "quality_objectives.status di-set otomatis AT_RISK jika
// current_value menyimpang lebih dari at_risk_threshold_percentage dari
// target_value; dapat di-override manual." PRD TIDAK beri arah deviasi
// (KPI "makin tinggi makin baik" mis. First Pass Yield vs "makin rendah
// makin baik" mis. defect rate) — dibaca sbg deviasi ABSOLUT (magnitude,
// bukan arah), gap TDD §26. OFF_TRACK/ACHIEVED/NOT_ACHIEVED/DISCONTINUED
// TIDAK PERNAH otomatis — literal PRD §4.5 poin 4 "direview formal pada
// siklus Management Review; hasil review memutakhirkan status" (tindakan
// manual, bukan hasil kalkulasi ini).
export function calculateObjectiveStatus(
  currentValue: number | null,
  targetValue: number,
  atRiskThresholdPercentage: number,
): Extract<QualityObjectiveStatus, "ON_TRACK" | "AT_RISK"> {
  if (currentValue === null || targetValue === 0) return "ON_TRACK";
  const deviationPercentage = (Math.abs(currentValue - targetValue) / Math.abs(targetValue)) * 100;
  return deviationPercentage > atRiskThresholdPercentage ? "AT_RISK" : "ON_TRACK";
}
