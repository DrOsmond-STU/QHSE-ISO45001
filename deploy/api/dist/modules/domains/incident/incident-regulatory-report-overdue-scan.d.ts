export interface RegulatoryReportOverdueCandidate {
    incidentRegulatoryReportId: string;
    requiredByDate: Date;
}
export declare function findOverdueRegulatoryReports(candidates: RegulatoryReportOverdueCandidate[], now: Date): RegulatoryReportOverdueCandidate[];
