"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRiskTreatmentStatusTransition = validateRiskTreatmentStatusTransition;
// PRD Modul 05 §5 enum "PLANNED -> IN_PROGRESS -> COMPLETED ->
// VERIFIED_EFFECTIVE, atau -> CANCELLED." CANCELLED dibaca bisa dicapai
// dari PLANNED/IN_PROGRESS (rencana yang belum/sedang berjalan wajar
// dibatalkan) TAPI TIDAK dari COMPLETED (sudah selesai, "membatalkan"
// tidak masuk akal — verifikasi efektivitas atau tidak, bukan pembatalan).
const ALLOWED_TRANSITIONS = {
    PLANNED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: ["VERIFIED_EFFECTIVE"],
    VERIFIED_EFFECTIVE: [],
    CANCELLED: [],
};
function validateRiskTreatmentStatusTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi risk_treatment_plans.status dari ${from} ke ${to} tidak valid.`);
    }
}
