import { InspectionRecurrencePattern } from "@prisma/client";
export declare function computeNextGenerationDate(current: Date, pattern: InspectionRecurrencePattern): Date | null;
export interface ScheduleGenerationCandidate {
    scheduleId: string;
    nextGenerationDate: Date;
    isActive: boolean;
    startDate: Date | null;
    endDate: Date | null;
}
export declare function findSchedulesDueForGeneration(candidates: ScheduleGenerationCandidate[], now: Date): ScheduleGenerationCandidate[];
