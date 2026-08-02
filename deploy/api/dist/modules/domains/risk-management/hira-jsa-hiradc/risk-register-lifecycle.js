"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRiskRegisterStatusTransition = validateRiskRegisterStatusTransition;
// PRD Modul 05 §5 enum "IDENTIFIED -> ASSESSED -> TREATMENT_IN_PROGRESS ->
// MONITORED -> CLOSED" — DIBACA LITERAL sbg rantai LINEAR TUNGGAL (beda
// dari notasi HIRA "atau ->" yang eksplisit menandai percabangan) — TIDAK
// ditambah jalur skip (mis. ASSESSED->MONITORED langsung utk risiko
// risk_appetite_status=WITHIN_APPETITE yang mungkin tidak butuh treatment)
// walau `risk_appetite_status` sendiri SECARA LOGIS mengesankan jalur itu
// masuk akal — gap TDD §26, keputusan SADAR tetap literal sampai ada
// kebutuhan konkret.
const ALLOWED_TRANSITIONS = {
    IDENTIFIED: ["ASSESSED"],
    ASSESSED: ["TREATMENT_IN_PROGRESS"],
    TREATMENT_IN_PROGRESS: ["MONITORED"],
    MONITORED: ["CLOSED"],
    CLOSED: [],
};
function validateRiskRegisterStatusTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi risk_register.status dari ${from} ke ${to} tidak valid.`);
    }
}
//# sourceMappingURL=risk-register-lifecycle.js.map