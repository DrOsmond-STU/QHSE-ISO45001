"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInspectionStatusTransition = validateInspectionStatusTransition;
exports.shouldAutoCreateNcr = shouldAutoCreateNcr;
exports.assertDeviationApprovedBeforeClose = assertDeviationApprovedBeforeClose;
// PRD Modul 11 §5 ERD — DRAFT->SUBMITTED->REVIEWED->CLOSED.
const ALLOWED_TRANSITIONS = {
    DRAFT: ["SUBMITTED"],
    SUBMITTED: ["REVIEWED"],
    REVIEWED: ["CLOSED"],
    CLOSED: [],
};
function validateInspectionStatusTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi quality_inspections.status dari ${from} ke ${to} tidak valid.`);
    }
}
// BR-03 — "quality_inspections dengan result_status = FAIL pada
// inspection_type IN (FINAL, PRE_SHIPMENT) otomatis membuat draft
// ncr_records."
function shouldAutoCreateNcr(resultStatus, inspectionType) {
    return resultStatus === "FAIL" && (inspectionType === "FINAL" || inspectionType === "PRE_SHIPMENT");
}
// BR-08 — "quality_inspections.overall_disposition = USE_AS_IS_DEVIATION
// wajib melalui approval workflow (QUALITY_INSPECTION_DEVIATION) sebelum
// status inspeksi CLOSED."
function assertDeviationApprovedBeforeClose(overallDisposition, deviationApproved) {
    if (overallDisposition === "USE_AS_IS_DEVIATION" && !deviationApproved) {
        throw new Error("quality_inspections overall_disposition=USE_AS_IS_DEVIATION tidak dapat CLOSED tanpa approval workflow QUALITY_INSPECTION_DEVIATION (BR-08).");
    }
}
//# sourceMappingURL=inspection-rules.js.map