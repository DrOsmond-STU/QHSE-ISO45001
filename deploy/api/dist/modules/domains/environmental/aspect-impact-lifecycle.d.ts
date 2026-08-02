import { EnvAspectImpactStatus, EnvSignificanceLevel } from "@prisma/client";
declare const SCORE_KEYS: readonly ["likelihood", "severity", "frequency", "regulatory", "stakeholderConcern"];
type ScoreKey = (typeof SCORE_KEYS)[number];
export interface AspectImpactScores {
    likelihoodScore: number;
    severityScore: number;
    frequencyScore: number;
    regulatoryScore: number;
    stakeholderConcernScore: number;
}
export declare function calculateSignificanceScore(scores: AspectImpactScores, weights?: Partial<Record<ScoreKey, number>>): number;
export declare function deriveSignificanceLevel(significanceScore: number, threshold: number): EnvSignificanceLevel;
export declare function assertControlsAdequateForActive(significanceLevel: EnvSignificanceLevel, existingControls: string | null, capaRegisterId: string | null): void;
export declare function validateAspectImpactStatusTransition(from: EnvAspectImpactStatus, to: EnvAspectImpactStatus): void;
export {};
