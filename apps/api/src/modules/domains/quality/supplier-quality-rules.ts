import { QualitySupplierRating, QualitySupplierRecordStatus } from "@prisma/client";

// PRD Modul 11 §5 ERD — DRAFT->SUBMITTED->APPROVED->ARCHIVED.
const ALLOWED_TRANSITIONS: Record<QualitySupplierRecordStatus, QualitySupplierRecordStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["APPROVED", "DRAFT"],
  APPROVED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function validateSupplierRecordStatusTransition(from: QualitySupplierRecordStatus, to: QualitySupplierRecordStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi supplier_quality_records.status dari ${from} ke ${to} tidak valid.`);
  }
}

// §4.4 poin 3 — "Jika rating Conditional/Suspended -> wajib capa_id."
export function assertCapaRequiredForRating(rating: QualitySupplierRating, capaRegisterId: string | null): void {
  if ((rating === "CONDITIONAL" || rating === "SUSPENDED") && !capaRegisterId) {
    throw new Error(`supplier_quality_records rating=${rating} wajib capa_id terisi.`);
  }
}
