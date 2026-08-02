"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDefaultRequiresCapa = resolveDefaultRequiresCapa;
exports.validateAuditFindingStatusTransition = validateAuditFindingStatusTransition;
// PRD §5 "requires_capa BOOLEAN default TRUE utk Major/Minor NC, FALSE
// utk Observation/OFI (dapat diubah manual)" — default MURNI, service
// layer TETAP izinkan override manual saat create (parameter eksplisit
// menang atas default ini).
function resolveDefaultRequiresCapa(classification) {
    return classification === "MAJOR_NC" || classification === "MINOR_NC";
}
// PRD §5 audit_findings.status literal 4 nilai. Transisi digerbang oleh
// requiresCapa (§4 poin 9 "Observation/OFI tidak memblokir closure audit"
// -> dibaca boleh loncat OPEN->CLOSED langsung TANPA lewat CAPA_LINKED/
// VERIFIED kalau memang tidak py CAPA; findings wajib-CAPA WAJIB lewat
// keduanya, konsisten BR-02/BR-03).
const MANDATORY_CAPA_TRANSITIONS = {
    OPEN: ["CAPA_LINKED"],
    CAPA_LINKED: ["VERIFIED"],
    VERIFIED: ["CLOSED"],
    CLOSED: [],
};
const OPTIONAL_CAPA_TRANSITIONS = {
    OPEN: ["CLOSED", "CAPA_LINKED"],
    CAPA_LINKED: ["VERIFIED"],
    VERIFIED: ["CLOSED"],
    CLOSED: [],
};
function validateAuditFindingStatusTransition(from, to, requiresCapa) {
    const table = requiresCapa ? MANDATORY_CAPA_TRANSITIONS : OPTIONAL_CAPA_TRANSITIONS;
    if (!table[from].includes(to)) {
        throw new Error(`Transisi audit_findings.status dari ${from} ke ${to} tidak valid (requiresCapa=${requiresCapa}).`);
    }
}
//# sourceMappingURL=audit-finding-rules.js.map