"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertDocumentAcceptsNewDistribution = assertDocumentAcceptsNewDistribution;
exports.assertClassificationAllowsTarget = assertClassificationAllowsTarget;
// BR-05 (PRD §6): "Dokumen berstatus RETIRED/OBSOLETE tidak dapat menjadi
// target document_distribution baru, namun tetap dapat diakses read-only
// oleh Auditor untuk bukti historis."
function assertDocumentAcceptsNewDistribution(status) {
    if (status === "RETIRED" || status === "OBSOLETE") {
        throw new Error(`Dokumen berstatus ${status} tidak dapat menerima distribusi baru (BR-05).`);
    }
}
// BR-07 (PRD §6): "Dokumen dengan classification = RESTRICTED/CONFIDENTIAL
// hanya dapat didistribusikan ke target USER/ROLE spesifik, tidak boleh
// ALL_TENANT."
function assertClassificationAllowsTarget(classification, targetType) {
    const restricted = classification === "RESTRICTED" || classification === "CONFIDENTIAL";
    if (restricted && targetType !== "USER" && targetType !== "ROLE") {
        throw new Error(`Dokumen classification=${classification} hanya boleh didistribusikan ke target USER/ROLE, bukan ${targetType} (BR-07).`);
    }
}
