import { RiskMatrixAxis } from "@prisma/client";
export interface DefaultMatrixLevel {
    axis: RiskMatrixAxis;
    levelValue: number;
    label: string;
    description: string | null;
}
export interface DefaultMatrixCell {
    likelihoodValue: number;
    severityValue: number;
    riskScore: number;
    riskLevel: string;
    colorCode: string;
    requiredActionDescription: string;
    requiresEscalation: boolean;
}
export declare function buildDefaultRiskMatrixLevels(): DefaultMatrixLevel[];
export declare function buildDefaultRiskMatrixCells(): DefaultMatrixCell[];
