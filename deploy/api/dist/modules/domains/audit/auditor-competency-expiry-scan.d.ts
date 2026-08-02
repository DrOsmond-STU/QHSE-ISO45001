export interface AuditorCompetencyExpiryCandidate {
    competencyRecordId: string;
    status: "ACTIVE" | "EXPIRED" | "REVOKED";
    expiryDate: Date | null;
}
export declare function findExpiredCompetencyRecords(candidates: AuditorCompetencyExpiryCandidate[], now: Date): AuditorCompetencyExpiryCandidate[];
export declare function findCompetencyRecordsApproachingExpiry(candidates: AuditorCompetencyExpiryCandidate[], now: Date): AuditorCompetencyExpiryCandidate[];
