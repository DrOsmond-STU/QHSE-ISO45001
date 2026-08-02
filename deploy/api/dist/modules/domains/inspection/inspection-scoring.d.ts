import { InspectionOverallResult, InspectionResponseType, InspectionScoringMethod } from "@prisma/client";
export declare function computeItemScore(responseType: InspectionResponseType, responseValue: string, weight: number): number | null;
export interface OverallScoreItem {
    scoreObtained: number | null;
    weight: number;
}
export declare function computeOverallScore(items: OverallScoreItem[]): number | null;
export interface MandatoryPassCheckItem {
    isMandatory: boolean;
    responseType: InspectionResponseType;
    responseValue: string;
}
export declare function computeAllMandatoryItemsPassed(items: MandatoryPassCheckItem[]): boolean;
export declare function computeOverallResult(scoringMethod: InspectionScoringMethod, overallScore: number | null, passingScoreThreshold: number | null, allMandatoryPassed: boolean): InspectionOverallResult;
