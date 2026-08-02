"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDefaultRiskMatrixLevels = buildDefaultRiskMatrixLevels;
exports.buildDefaultRiskMatrixCells = buildDefaultRiskMatrixCells;
// PRD §5 contoh literal "Matriks Risiko K3 Standar 5x5" — generator matriks
// DEFAULT (bukan satu-satunya yang mungkin, Tenant Admin bebas edit lewat
// Visual Builder PRD §12 sesudahnya) dipakai RiskMatrixBootstrapService.ensureDefaultMatrix()
// saat tenant belum punya matriks aktif utk scope tertentu sama sekali.
//
// Formula skor MULTIPLICATIVE (likelihood x severity) adalah RESOLUSI Open
// Question #1 PRD §13 KHUSUS UTK KASUS DEFAULT INI — tenant tetap bebas
// menyimpan risk_score APA PUN per cell (schema tidak menegakkan formula
// apa pun), resolveRiskScore() (risk-matrix-lookup.ts) murni baca nilai
// tersimpan, tidak pernah menghitung ulang dari likelihood x severity.
//
// Band skor (LOW 1-4/MEDIUM 5-9/HIGH 10-15/EXTREME 16-25) dipilih krn cocok
// BERSIH dgn seluruh 14 nilai skor yang genuinely achievable dari grid 5x5
// (1,2,3,4,5,6,8,9,10,12,15,16,20,25) — BUKAN tiap integer 1-25 dicapai
// perkalian i x j utk i,j di [1,5] (mis. 7/11/13/14 mustahil), jadi band
// dipilih supaya tidak ada celah/tumpang tindih di nilai yang genuinely bisa
// muncul, bukan sekadar interval rata 1-25.
const LIKELIHOOD_LABELS = [
    "Jarang/Rare",
    "Kecil Kemungkinan/Unlikely",
    "Mungkin Terjadi/Possible",
    "Sering Terjadi/Likely",
    "Hampir Pasti/Almost Certain",
];
const SEVERITY_LABELS = [
    "Dapat Diabaikan/Negligible",
    "Ringan/Minor",
    "Sedang/Moderate",
    "Berat/Major",
    "Katastropik/Catastrophic",
];
function resolveBand(score) {
    if (score >= 16)
        return { level: "EXTREME", color: "#F44336", action: "Wajib tindakan segera & approval Direksi", requiresEscalation: true };
    if (score >= 10)
        return { level: "HIGH", color: "#FF9800", action: "Wajib tindakan pengendalian tambahan sebelum pekerjaan dimulai", requiresEscalation: false };
    if (score >= 5)
        return { level: "MEDIUM", color: "#FFC107", action: "Pantau & tinjau efektivitas kontrol yang ada", requiresEscalation: false };
    return { level: "LOW", color: "#4CAF50", action: "Dapat diterima dengan kontrol rutin", requiresEscalation: false };
}
function buildDefaultRiskMatrixLevels() {
    const levels = [];
    LIKELIHOOD_LABELS.forEach((label, i) => levels.push({ axis: "LIKELIHOOD", levelValue: i + 1, label, description: null }));
    SEVERITY_LABELS.forEach((label, i) => levels.push({ axis: "SEVERITY", levelValue: i + 1, label, description: null }));
    return levels;
}
function buildDefaultRiskMatrixCells() {
    const cells = [];
    for (let likelihoodValue = 1; likelihoodValue <= 5; likelihoodValue++) {
        for (let severityValue = 1; severityValue <= 5; severityValue++) {
            const riskScore = likelihoodValue * severityValue;
            const band = resolveBand(riskScore);
            cells.push({
                likelihoodValue,
                severityValue,
                riskScore,
                riskLevel: band.level,
                colorCode: band.color,
                requiredActionDescription: band.action,
                requiresEscalation: band.requiresEscalation,
            });
        }
    }
    return cells;
}
//# sourceMappingURL=default-risk-matrix.js.map