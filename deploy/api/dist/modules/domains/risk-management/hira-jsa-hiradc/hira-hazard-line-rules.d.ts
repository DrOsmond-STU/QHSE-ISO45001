export interface HiraHazardLineControlCandidate {
    riskLevelAfter: string;
    requiresEscalationAfter: boolean;
    additionalControlsRequired: string | null;
}
export declare function assertControlsPresentIfStillHighRisk(line: HiraHazardLineControlCandidate): void;
export declare function assertAllControlsPresentIfStillHighRisk(lines: HiraHazardLineControlCandidate[]): void;
