export declare const HIGH_SEVERITY_FINDING_SLA_HOURS = 24;
export interface FindingSlaCandidate {
    findingId: string;
    identifiedAt: Date;
}
export declare function findHighSeverityFindingsNeedingEscalation(candidates: FindingSlaCandidate[], now: Date): FindingSlaCandidate[];
