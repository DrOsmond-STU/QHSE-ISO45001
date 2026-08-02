"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDocumentVersionStatusTransition = validateDocumentVersionStatusTransition;
exports.assertCanBeCurrentVersion = assertCanBeCurrentVersion;
exports.computeNextVersionNumber = computeNextVersionNumber;
// PRD Modul 03 §5 enum status: "DRAFT -> PENDING_APPROVAL -> APPROVED ->
// PUBLISHED -> SUPERSEDED, atau PENDING_APPROVAL -> REJECTED". APPROVED
// murni transisi ANTARA (workflow instance selesai) sebelum
// DocumentWorkflowCompletionListener menuliskan PUBLISHED dalam transaksi
// yang sama — tidak ada baris yang PERNAH berhenti lama di APPROVED.
const ALLOWED_TRANSITIONS = {
    DRAFT: ["PENDING_APPROVAL"],
    PENDING_APPROVAL: ["APPROVED", "REJECTED"],
    APPROVED: ["PUBLISHED"],
    PUBLISHED: ["SUPERSEDED"],
    SUPERSEDED: [],
    REJECTED: [],
};
function validateDocumentVersionStatusTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi document_versions.status dari ${from} ke ${to} tidak valid.`);
    }
}
// BR-02 (PRD §6): documents.current_version_id HANYA boleh diarahkan ke
// document_versions berstatus PUBLISHED.
function assertCanBeCurrentVersion(status) {
    if (status !== "PUBLISHED") {
        throw new Error(`document_versions berstatus ${status} tidak boleh jadi documents.current_version_id (BR-02, wajib PUBLISHED).`);
    }
}
function computeNextVersionNumber(previous, bump) {
    if (previous === null) {
        return { majorVersion: 1, minorVersion: 0 };
    }
    if (bump === "MAJOR") {
        return { majorVersion: previous.majorVersion + 1, minorVersion: 0 };
    }
    return { majorVersion: previous.majorVersion, minorVersion: previous.minorVersion + 1 };
}
//# sourceMappingURL=document-version-lifecycle.js.map