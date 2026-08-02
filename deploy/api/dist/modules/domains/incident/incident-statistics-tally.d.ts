import { IncidentClassification } from "@prisma/client";
export interface IncidentTallyInput {
    classification: IncidentClassification;
    daysLost: number | null;
}
export interface IncidentTallyResult {
    fatalityCount: number;
    ltiCount: number;
    restrictedWorkCount: number;
    medicalTreatmentCount: number;
    firstAidCount: number;
    nearMissCount: number;
    propertyDamageCount: number;
    environmentalSpillCount: number;
    processSafetyEventCount: number;
    totalDaysLost: number;
}
export declare function tallyIncidentCounts(reports: IncidentTallyInput[]): IncidentTallyResult;
