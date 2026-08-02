"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateComplaintStatusTransition = validateComplaintStatusTransition;
exports.assertCapaRequiredForCategory = assertCapaRequiredForCategory;
exports.isInitialResponseOverdue = isInitialResponseOverdue;
// PRD Modul 11 §5 ERD + §4.2 alur — RECEIVED->UNDER_INVESTIGATION->
// CAPA_IN_PROGRESS->RESOLVED->CLOSED, atau REJECTED_INVALID dari status
// non-terminal manapun (komplain ternyata tidak valid).
const ALLOWED_TRANSITIONS = {
    RECEIVED: ["UNDER_INVESTIGATION", "REJECTED_INVALID"],
    UNDER_INVESTIGATION: ["CAPA_IN_PROGRESS", "RESOLVED", "REJECTED_INVALID"],
    CAPA_IN_PROGRESS: ["RESOLVED", "REJECTED_INVALID"],
    RESOLVED: ["CLOSED"],
    CLOSED: [],
    REJECTED_INVALID: [],
};
function validateComplaintStatusTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi customer_complaints.status dari ${from} ke ${to} tidak valid.`);
    }
}
// BR-01-analog (§4.2 poin 3) — "root cause & tindakan perbaikan WAJIB
// capa_id terisi utk complaint kategori HIGH/CRITICAL."
function assertCapaRequiredForCategory(severity, capaRegisterId) {
    if ((severity === "HIGH" || severity === "CRITICAL") && !capaRegisterId) {
        throw new Error(`customer_complaints severity=${severity} tidak dapat masuk CAPA_IN_PROGRESS tanpa capa_id terisi.`);
    }
}
// BR-02 — "customer_complaints wajib direspon awal ke pelanggan sesuai SLA
// tenant (default 2x24 jam); pelanggaran SLA memicu notifikasi eskalasi."
function isInitialResponseOverdue(dueDate, sentAt, now) {
    if (sentAt !== null)
        return false;
    return now.getTime() > dueDate.getTime();
}
