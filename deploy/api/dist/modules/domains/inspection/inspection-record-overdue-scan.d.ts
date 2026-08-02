export interface RecordOverdueCandidate {
    recordId: string;
    plannedDate: Date | null;
}
export declare function findOverdueInspectionRecords(candidates: RecordOverdueCandidate[], now: Date): RecordOverdueCandidate[];
