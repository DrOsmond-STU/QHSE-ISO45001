import { QualityInspectionDisposition, QualityInspectionResultStatus, QualityInspectionStatus, QualityInspectionType } from "@prisma/client";

// PRD Modul 11 §5 ERD — DRAFT->SUBMITTED->REVIEWED->CLOSED.
const ALLOWED_TRANSITIONS: Record<QualityInspectionStatus, QualityInspectionStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["REVIEWED"],
  REVIEWED: ["CLOSED"],
  CLOSED: [],
};

export function validateInspectionStatusTransition(from: QualityInspectionStatus, to: QualityInspectionStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi quality_inspections.status dari ${from} ke ${to} tidak valid.`);
  }
}

// BR-03 — "quality_inspections dengan result_status = FAIL pada
// inspection_type IN (FINAL, PRE_SHIPMENT) otomatis membuat draft
// ncr_records."
export function shouldAutoCreateNcr(resultStatus: QualityInspectionResultStatus, inspectionType: QualityInspectionType): boolean {
  return resultStatus === "FAIL" && (inspectionType === "FINAL" || inspectionType === "PRE_SHIPMENT");
}

// BR-08 — "quality_inspections.overall_disposition = USE_AS_IS_DEVIATION
// wajib melalui approval workflow (QUALITY_INSPECTION_DEVIATION) sebelum
// status inspeksi CLOSED."
export function assertDeviationApprovedBeforeClose(
  overallDisposition: QualityInspectionDisposition | null,
  deviationApproved: boolean,
): void {
  if (overallDisposition === "USE_AS_IS_DEVIATION" && !deviationApproved) {
    throw new Error("quality_inspections overall_disposition=USE_AS_IS_DEVIATION tidak dapat CLOSED tanpa approval workflow QUALITY_INSPECTION_DEVIATION (BR-08).");
  }
}
