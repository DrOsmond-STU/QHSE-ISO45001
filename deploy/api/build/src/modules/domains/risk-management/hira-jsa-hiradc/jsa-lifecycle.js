"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateJsaRecordStatusTransition = validateJsaRecordStatusTransition;
// PRD Modul 05 §5 enum "DRAFT -> APPROVED -> ACTIVE -> EXPIRED/ARCHIVED" —
// BEDA dari HIRA: TIDAK ADA status IN_REVIEW/SUBMITTED terpisah sama
// sekali (5 nilai literal saja). Dibaca literal: status TETAP "DRAFT"
// SELAMA proses approval berjalan (workflow_tasks PENDING yang
// merepresentasikan "sedang direview", bukan kolom status JSA sendiri) —
// APPROVE final mengubah DRAFT->APPROVED->ACTIVE SATU TRANSAKSI (pola
// PERSIS HIRA/DocumentVersion). REJECT karena itu TIDAK mengubah status
// APAPUN (sudah DRAFT, tidak pernah "keluar" dari situ) — cukup bersihkan
// workflowInstanceId supaya bisa disubmit ulang, TIDAK ADA transisi status
// yang perlu divalidasi utk jalur reject (beda dari HIRA yang py
// REQUIRES_REVISION tersendiri).
const ALLOWED_TRANSITIONS = {
    DRAFT: ["APPROVED"],
    APPROVED: ["ACTIVE"],
    ACTIVE: ["EXPIRED", "ARCHIVED"],
    EXPIRED: ["ARCHIVED"],
    ARCHIVED: [],
};
function validateJsaRecordStatusTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi jsa_records.status dari ${from} ke ${to} tidak valid.`);
    }
}
