"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertInvestigationApprovedIfRequiredForClosure = assertInvestigationApprovedIfRequiredForClosure;
// BR-01 (PRD Modul 07 §6) literal: "incident_reports dengan classification
// FATALITY/LOST_TIME_INJURY/PROCESS_SAFETY_EVENT wajib memiliki
// incident_investigations berstatus APPROVED sebelum dapat CLOSED." §4 poin
// 4 (prosa alur) MENYEBUT 1 klasifikasi TAMBAHAN (RESTRICTED_WORK_CASE)
// sbg "wajib investigasi" — TAPI BR-01 (bagian "Aturan Bisnis & Validasi",
// section yang genuinely enforceable) TIDAK menyertakannya. Diimplementasikan
// PERSIS daftar BR-01 (3 klasifikasi) krn itu section yang eksplisit
// berjudul aturan bisnis; RESTRICTED_WORK_CASE karena itu TIDAK di-gate
// investigasi APPROVED sebelum CLOSED (gap didokumentasikan TDD §26).
const MANDATORY_INVESTIGATION_FOR_CLOSURE = new Set([
    "FATALITY",
    "LOST_TIME_INJURY",
    "PROCESS_SAFETY_EVENT",
]);
function assertInvestigationApprovedIfRequiredForClosure(classification, latestInvestigationStatus) {
    if (!MANDATORY_INVESTIGATION_FOR_CLOSURE.has(classification))
        return;
    if (latestInvestigationStatus !== "APPROVED") {
        throw new Error(`incident_reports classification=${classification} wajib memiliki incident_investigations berstatus APPROVED sebelum dapat CLOSED (BR-01).`);
    }
}
//# sourceMappingURL=incident-investigation-rules.js.map