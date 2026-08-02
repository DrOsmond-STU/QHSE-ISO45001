"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInspectionRecordStatusTransition = validateInspectionRecordStatusTransition;
// PRD §5 enum literal menyebut NILAI TANPA tabel transisi eksplisit — pola
// sama seluruh modul lain. COMPLETED->IN_PROGRESS SENGAJA diizinkan (BR-03
// "reopen oleh HSE Manager dengan jejak audit") — validator murni cek
// EDGE-nya valid, "siapa boleh" (HSE Manager) ditegakkan service layer,
// bukan di sini.
const ALLOWED_TRANSITIONS = {
    SCHEDULED: ["IN_PROGRESS", "OVERDUE", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "OVERDUE", "CANCELLED"],
    OVERDUE: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
    COMPLETED: ["IN_PROGRESS"],
    CANCELLED: [],
};
function validateInspectionRecordStatusTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi inspection_records.status dari ${from} ke ${to} tidak valid.`);
    }
}
//# sourceMappingURL=inspection-lifecycle.js.map