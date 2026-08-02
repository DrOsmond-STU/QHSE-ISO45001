import { EnvProperRating, EnvProperSubmissionStatus } from "@prisma/client";
export interface CriteriaScoreInput {
    scoreValue: number;
    weightPercentage: number;
}
export declare function calculateComplianceScorePercentage(scores: CriteriaScoreInput[]): number;
export declare function deriveProperRating(complianceScorePercentage: number): EnvProperRating;
export declare function assertOverrideJustificationRequired(isOverride: boolean, overrideJustification: string | null): void;
export declare function validateProperSubmissionStatusTransition(from: EnvProperSubmissionStatus, to: EnvProperSubmissionStatus): void;
