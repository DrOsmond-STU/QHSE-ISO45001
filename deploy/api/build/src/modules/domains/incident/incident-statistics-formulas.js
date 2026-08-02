"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLtifr = calculateLtifr;
exports.calculateTrir = calculateTrir;
exports.calculateSeverityRate = calculateSeverityRate;
function calculateLtifr(input) {
    if (input.totalManhoursWorked === 0)
        return 0;
    return (input.ltiCount * input.rateBaseHoursUsed) / input.totalManhoursWorked;
}
// PRD §5 literal formula HANYA menjumlahkan LTI+Restricted Work Case+Medical
// Treatment Case sbg "recordable" — TIDAK menyertakan Fatality (beda dari
// TRIR gaya OSHA standar yang lazimnya menghitung fatality sbg recordable
// juga) — diimplementasikan PERSIS teks PRD, kejanggalan didokumentasikan
// TDD §26 alih-alih diam-diam "dikoreksi".
function calculateTrir(input) {
    if (input.totalManhoursWorked === 0)
        return 0;
    const recordableCount = input.ltiCount + input.restrictedWorkCount + input.medicalTreatmentCount;
    return (recordableCount * input.rateBaseHoursUsed) / input.totalManhoursWorked;
}
function calculateSeverityRate(input) {
    if (input.totalManhoursWorked === 0)
        return 0;
    return (input.totalDaysLost * input.rateBaseHoursUsed) / input.totalManhoursWorked;
}
