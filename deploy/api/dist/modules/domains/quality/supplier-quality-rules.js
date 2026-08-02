"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSupplierRecordStatusTransition = validateSupplierRecordStatusTransition;
exports.assertCapaRequiredForRating = assertCapaRequiredForRating;
// PRD Modul 11 §5 ERD — DRAFT->SUBMITTED->APPROVED->ARCHIVED.
const ALLOWED_TRANSITIONS = {
    DRAFT: ["SUBMITTED"],
    SUBMITTED: ["APPROVED", "DRAFT"],
    APPROVED: ["ARCHIVED"],
    ARCHIVED: [],
};
function validateSupplierRecordStatusTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi supplier_quality_records.status dari ${from} ke ${to} tidak valid.`);
    }
}
// §4.4 poin 3 — "Jika rating Conditional/Suspended -> wajib capa_id."
function assertCapaRequiredForRating(rating, capaRegisterId) {
    if ((rating === "CONDITIONAL" || rating === "SUSPENDED") && !capaRegisterId) {
        throw new Error(`supplier_quality_records rating=${rating} wajib capa_id terisi.`);
    }
}
//# sourceMappingURL=supplier-quality-rules.js.map