"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAuditStatusTransition = validateAuditStatusTransition;
exports.computeTargetClosureDate = computeTargetClosureDate;
exports.assertAuditCloseAllowed = assertAuditCloseAllowed;
// PRD Modul 09 §5 enum literal (7 nilai) — jalur linear murni sesuai §4
// (rencana->pelaksanaan->laporan->tindak lanjut->closure), TANPA jalur
// "kembali" (beda dari audit_programs DRAFT<->APPROVED yg py REJECT path)
// — PRD tidak menyebut mekanisme "audit dibuka lagi setelah REPORT_DRAFTED".
const ALLOWED_AUDIT_TRANSITIONS = {
    PLANNED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["REPORT_DRAFTED", "CANCELLED"],
    REPORT_DRAFTED: ["REPORT_APPROVED"],
    REPORT_APPROVED: ["PENDING_CAPA_CLOSURE", "CLOSED"],
    PENDING_CAPA_CLOSURE: ["CLOSED"],
    CLOSED: [],
    CANCELLED: [],
};
function validateAuditStatusTransition(from, to) {
    if (!ALLOWED_AUDIT_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi audits.status dari ${from} ke ${to} tidak valid.`);
    }
}
// BR-04 — "target_closure_date pada audit_findings dihitung otomatis dari
// identified_at + SLA per classification (default Major NC 30 hari, Minor
// NC 60 hari)." Observation/OFI "tanpa tenggat ketat namun tetap dilacak"
// (§4 poin 9) -> dibaca literal sbg TIDAK ADA target_closure_date (null),
// bukan tenggat default tersembunyi.
const CLOSURE_SLA_DAYS = {
    MAJOR_NC: 30,
    MINOR_NC: 60,
};
function computeTargetClosureDate(identifiedAt, classification) {
    const slaDays = CLOSURE_SLA_DAYS[classification];
    if (!slaDays)
        return null;
    const target = new Date(identifiedAt);
    target.setUTCDate(target.getUTCDate() + slaDays);
    return target;
}
function assertAuditCloseAllowed(findings, reportStatus) {
    if (reportStatus !== "APPROVED") {
        throw new Error("audits tidak dapat CLOSED — audit_reports belum berstatus APPROVED (BR-03).");
    }
    const unclosedMandatory = findings.filter((f) => f.requiresCapa && f.status !== "CLOSED");
    if (unclosedMandatory.length > 0) {
        throw new Error(`audits tidak dapat CLOSED — ${unclosedMandatory.length} audit_findings wajib-CAPA belum CLOSED (BR-02/BR-03).`);
    }
}
//# sourceMappingURL=audit-lifecycle.js.map