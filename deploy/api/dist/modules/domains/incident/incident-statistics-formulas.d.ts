export interface IncidentRateInput {
    ltiCount: number;
    restrictedWorkCount: number;
    medicalTreatmentCount: number;
    totalDaysLost: number;
    totalManhoursWorked: number;
    rateBaseHoursUsed: number;
}
export declare function calculateLtifr(input: IncidentRateInput): number;
export declare function calculateTrir(input: IncidentRateInput): number;
export declare function calculateSeverityRate(input: Pick<IncidentRateInput, "totalDaysLost" | "totalManhoursWorked" | "rateBaseHoursUsed">): number;
