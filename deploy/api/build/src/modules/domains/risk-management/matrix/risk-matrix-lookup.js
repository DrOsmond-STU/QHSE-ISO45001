"use strict";
// Pure logic — mirror numbering-pattern.ts (0.10)/holiday-calendar.ts (1.2)
// style: tanpa Prisma/DB, leaf function konsumsi RiskMatrixConfigService
// (task 3.1) DAN task 3.2 (hira_hazard_lines/hiradc_lines/risk_register
// mengisi risk_score_before/after).
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRiskScore = resolveRiskScore;
/**
 * BR-01 (PRD Modul 05 §6) — "risk_score/risk_level pada seluruh tabel
 * garis dihitung OTOMATIS dari risk_matrix_cells yang aktif ... bukan
 * input manual." Fail loud (bukan diam-diam null/0) kalau kombinasi
 * likelihood/severity tidak punya cell — mengindikasikan data korup
 * (assessment mengacu likelihoodLevels/severityLevels di luar rentang
 * risk_matrix_configs-nya sendiri) atau bug caller, bukan skenario yang
 * boleh lolos diam-diam.
 */
function resolveRiskScore(cells, likelihoodValue, severityValue) {
    const cell = cells.find((c) => c.likelihoodValue === likelihoodValue && c.severityValue === severityValue);
    if (!cell) {
        throw new Error(`Tidak ada risk_matrix_cells utk likelihood=${likelihoodValue}, severity=${severityValue} pada matriks ini.`);
    }
    return { riskScore: cell.riskScore, riskLevel: cell.riskLevel, requiresEscalation: cell.requiresEscalation };
}
