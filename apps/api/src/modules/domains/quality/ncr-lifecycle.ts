import { QualityNcrDisposition, QualityNcrReInspectionResult, QualityNcrSeverity, QualityNcrStatus } from "@prisma/client";

// PRD Modul 11 §5 ERD + §4.1 alur — OPEN->CONTAINMENT->DISPOSITION_PENDING->
// DISPOSITIONED->[CAPA_LINKED jika MAJOR/CRITICAL]->CLOSED, atau CANCELLED
// dari status non-terminal manapun.
const ALLOWED_TRANSITIONS: Record<QualityNcrStatus, QualityNcrStatus[]> = {
  OPEN: ["CONTAINMENT", "CANCELLED"],
  CONTAINMENT: ["DISPOSITION_PENDING", "CANCELLED"],
  DISPOSITION_PENDING: ["DISPOSITIONED", "CANCELLED"],
  DISPOSITIONED: ["CAPA_LINKED", "CLOSED", "CANCELLED"],
  CAPA_LINKED: ["CLOSED", "CANCELLED"],
  CLOSED: [],
  CANCELLED: [],
};

export function validateNcrStatusTransition(from: QualityNcrStatus, to: QualityNcrStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi ncr_records.status dari ${from} ke ${to} tidak valid.`);
  }
}

// BR-01 — "ncr_records dengan severity IN (MAJOR, CRITICAL) wajib memiliki
// capa_id terisi sebelum status = CLOSED."
export function assertCapaRequiredBeforeClose(severity: QualityNcrSeverity, capaRegisterId: string | null): void {
  if ((severity === "MAJOR" || severity === "CRITICAL") && !capaRegisterId) {
    throw new Error(`ncr_records severity=${severity} tidak dapat CLOSED tanpa capa_id terisi (BR-01).`);
  }
}

// BR-07 — "ncr_records dengan disposition IN (REWORK, REPAIR) wajib
// re_inspection_result = PASS sebelum status dapat berubah dari
// DISPOSITIONED ke CLOSED."
export function assertReInspectionPassedBeforeClose(
  disposition: QualityNcrDisposition,
  reInspectionResult: QualityNcrReInspectionResult | null,
): void {
  if ((disposition === "REWORK" || disposition === "REPAIR") && reInspectionResult !== "PASS") {
    throw new Error(`ncr_records disposition=${disposition} tidak dapat CLOSED tanpa re_inspection_result=PASS (BR-07).`);
  }
}

// PRD §5 "re_inspection_required default TRUE jika disposisi REWORK/REPAIR" —
// default DB statis tidak bisa kondisional thd kolom lain, dihitung di sini.
export function resolveReInspectionRequired(disposition: QualityNcrDisposition): boolean {
  return disposition === "REWORK" || disposition === "REPAIR";
}
