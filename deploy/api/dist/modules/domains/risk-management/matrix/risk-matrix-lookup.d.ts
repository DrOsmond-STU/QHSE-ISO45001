export interface RiskMatrixCellCandidate {
    likelihoodValue: number;
    severityValue: number;
    riskScore: number;
    riskLevel: string;
    requiresEscalation: boolean;
}
export interface ResolvedRiskScore {
    riskScore: number;
    riskLevel: string;
    requiresEscalation: boolean;
}
/**
 * BR-01 (PRD Modul 05 §6) — "risk_score/risk_level pada seluruh tabel
 * garis dihitung OTOMATIS dari risk_matrix_cells yang aktif ... bukan
 * input manual." Fail loud (bukan diam-diam null/0) kalau kombinasi
 * likelihood/severity tidak punya cell — mengindikasikan data korup
 * (assessment mengacu likelihoodLevels/severityLevels di luar rentang
 * risk_matrix_configs-nya sendiri) atau bug caller, bukan skenario yang
 * boleh lolos diam-diam.
 */
export declare function resolveRiskScore(cells: RiskMatrixCellCandidate[], likelihoodValue: number, severityValue: number): ResolvedRiskScore;
