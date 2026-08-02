import { QualityObjectiveStatus } from "@prisma/client";
export declare function calculateObjectiveStatus(currentValue: number | null, targetValue: number, atRiskThresholdPercentage: number): Extract<QualityObjectiveStatus, "ON_TRACK" | "AT_RISK">;
