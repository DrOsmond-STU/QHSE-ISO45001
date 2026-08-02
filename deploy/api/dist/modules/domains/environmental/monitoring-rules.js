"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateComplianceStatus = calculateComplianceStatus;
exports.assertLabReportAttachedBeforeVerified = assertLabReportAttachedBeforeVerified;
exports.validateMonitoringRecordStatusTransition = validateMonitoringRecordStatusTransition;
// PRD §5 literal "compliance_status dihitung otomatis dari result_value
// vs baku_mutu_min/baku_mutu_max". Kedua ambang nullable (tidak semua
// parameter py baku mutu eksplisit) — TIDAK ADA ambang sama sekali ->
// NOT_APPLICABLE (bukan COMPLIANT/EXCEED, krn tidak ada dasar pembanding).
function calculateComplianceStatus(resultValue, bakuMutuMin, bakuMutuMax) {
    if (bakuMutuMin === null && bakuMutuMax === null)
        return "NOT_APPLICABLE";
    if (bakuMutuMin !== null && resultValue < bakuMutuMin)
        return "EXCEED";
    if (bakuMutuMax !== null && resultValue > bakuMutuMax)
        return "EXCEED";
    return "COMPLIANT";
}
// BR-07 — "Setiap environmental_monitoring_records wajib memiliki lampiran
// laporan hasil uji lab sebelum status berubah dari RECORDED ke VERIFIED."
// hasLabReportAttachment dihitung caller (query attachments generik
// entity_type=environmental_monitoring_record, pola sama BR-07 Modul 08 3.6).
function assertLabReportAttachedBeforeVerified(hasLabReportAttachment) {
    if (!hasLabReportAttachment) {
        throw new Error("environmental_monitoring_records wajib memiliki lampiran laporan hasil uji lab sebelum status VERIFIED (BR-07).");
    }
}
const ALLOWED_TRANSITIONS = {
    RECORDED: ["VERIFIED"],
    VERIFIED: ["REPORTED_TO_REGULATOR"],
    REPORTED_TO_REGULATOR: [],
};
function validateMonitoringRecordStatusTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi environmental_monitoring_records.status dari ${from} ke ${to} tidak valid.`);
    }
}
//# sourceMappingURL=monitoring-rules.js.map