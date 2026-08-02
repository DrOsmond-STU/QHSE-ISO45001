"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeItemScore = computeItemScore;
exports.computeOverallScore = computeOverallScore;
exports.computeAllMandatoryItemsPassed = computeAllMandatoryItemsPassed;
exports.computeOverallResult = computeOverallResult;
// BR-03 (PRD Modul 08 §6) — "overall_score dihitung otomatis dari agregasi
// berbobot inspection_record_items saat status berpindah ke COMPLETED."
// PRD TIDAK menyediakan formula per-response_type literal (beda dari
// formula LTIFR/TRIR Incident 3.5 yang eksplisit) — pemetaan di bawah
// SEPENUHNYA diasumsikan, gap TDD §26.
// PASS_FAIL/YES_NO -> weight penuh atau 0. SCALE_1_5 -> proporsional
// (value/5)*weight. TEXT/NUMERIC -> TIDAK diskor langsung (null,
// informational saja) — PRD tidak jelaskan cara numeric/text jadi skor.
function computeItemScore(responseType, responseValue, weight) {
    switch (responseType) {
        case "PASS_FAIL":
            if (responseValue === "PASS")
                return weight;
            if (responseValue === "FAIL")
                return 0;
            return null;
        case "YES_NO":
            if (responseValue === "YES")
                return weight;
            if (responseValue === "NO")
                return 0;
            return null;
        case "SCALE_1_5": {
            const numeric = Number(responseValue);
            if (!Number.isFinite(numeric) || numeric < 1 || numeric > 5)
                return null;
            return (numeric / 5) * weight;
        }
        case "TEXT":
        case "NUMERIC":
            return null;
        default:
            return null;
    }
}
// Item dgn scoreObtained=null (TEXT/NUMERIC/respons tidak valid) DIKELUARKAN
// dari agregasi sepenuhnya (bukan dianggap 0) — supaya item non-scoreable
// tidak menurunkan overall_score secara tidak adil.
function computeOverallScore(items) {
    const scoreable = items.filter((i) => i.scoreObtained !== null);
    if (scoreable.length === 0)
        return null;
    const totalObtained = scoreable.reduce((sum, i) => sum + i.scoreObtained, 0);
    const totalMax = scoreable.reduce((sum, i) => sum + i.weight, 0);
    if (totalMax === 0)
        return null;
    return (totalObtained / totalMax) * 100;
}
// Dipakai scoringMethod=PASS_FAIL_ONLY — item mandatory ber-responseType
// SELAIN PASS_FAIL/YES_NO dianggap TIDAK memblokir (scoring method itu
// sendiri konseptual hanya peduli item pass/fail).
function computeAllMandatoryItemsPassed(items) {
    return items.every((item) => {
        if (!item.isMandatory)
            return true;
        if (item.responseType === "PASS_FAIL")
            return item.responseValue === "PASS";
        if (item.responseType === "YES_NO")
            return item.responseValue === "YES";
        return true;
    });
}
// scoringMethod=WEIGHTED_SCORE TANPA passingScoreThreshold terisi (kolom
// nullable PRD §5) -> NA (gap TDD §26, fallback aman drpd menebak ambang).
function computeOverallResult(scoringMethod, overallScore, passingScoreThreshold, allMandatoryPassed) {
    if (scoringMethod === "CHECKLIST_NO_SCORE")
        return "NA";
    if (scoringMethod === "PASS_FAIL_ONLY")
        return allMandatoryPassed ? "PASS" : "FAIL";
    if (overallScore === null || passingScoreThreshold === null)
        return "NA";
    return overallScore >= passingScoreThreshold ? "PASS" : "FAIL";
}
