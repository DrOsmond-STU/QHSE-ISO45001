"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateNcrStatusTransition = validateNcrStatusTransition;
exports.assertCapaRequiredBeforeClose = assertCapaRequiredBeforeClose;
exports.assertReInspectionPassedBeforeClose = assertReInspectionPassedBeforeClose;
exports.resolveReInspectionRequired = resolveReInspectionRequired;
// PRD Modul 11 §5 ERD + §4.1 alur — OPEN->CONTAINMENT->DISPOSITION_PENDING->
// DISPOSITIONED->[CAPA_LINKED jika MAJOR/CRITICAL]->CLOSED, atau CANCELLED
// dari status non-terminal manapun.
const ALLOWED_TRANSITIONS = {
    OPEN: ["CONTAINMENT", "CANCELLED"],
    CONTAINMENT: ["DISPOSITION_PENDING", "CANCELLED"],
    DISPOSITION_PENDING: ["DISPOSITIONED", "CANCELLED"],
    DISPOSITIONED: ["CAPA_LINKED", "CLOSED", "CANCELLED"],
    CAPA_LINKED: ["CLOSED", "CANCELLED"],
    CLOSED: [],
    CANCELLED: [],
};
function validateNcrStatusTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi ncr_records.status dari ${from} ke ${to} tidak valid.`);
    }
}
// BR-01 — "ncr_records dengan severity IN (MAJOR, CRITICAL) wajib memiliki
// capa_id terisi sebelum status = CLOSED."
function assertCapaRequiredBeforeClose(severity, capaRegisterId) {
    if ((severity === "MAJOR" || severity === "CRITICAL") && !capaRegisterId) {
        throw new Error(`ncr_records severity=${severity} tidak dapat CLOSED tanpa capa_id terisi (BR-01).`);
    }
}
// BR-07 — "ncr_records dengan disposition IN (REWORK, REPAIR) wajib
// re_inspection_result = PASS sebelum status dapat berubah dari
// DISPOSITIONED ke CLOSED."
function assertReInspectionPassedBeforeClose(disposition, reInspectionResult) {
    if ((disposition === "REWORK" || disposition === "REPAIR") && reInspectionResult !== "PASS") {
        throw new Error(`ncr_records disposition=${disposition} tidak dapat CLOSED tanpa re_inspection_result=PASS (BR-07).`);
    }
}
// PRD §5 "re_inspection_required default TRUE jika disposisi REWORK/REPAIR" —
// default DB statis tidak bisa kondisional thd kolom lain, dihitung di sini.
function resolveReInspectionRequired(disposition) {
    return disposition === "REWORK" || disposition === "REPAIR";
}
//# sourceMappingURL=ncr-lifecycle.js.map