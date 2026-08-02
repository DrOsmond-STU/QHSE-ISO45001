import { OhFitStatus, OhMcuResultOverall, OhMcuResultStatus, OhMcuScheduleStatus } from "@prisma/client";
export declare function validateMcuScheduleStatusTransition(from: OhMcuScheduleStatus, to: OhMcuScheduleStatus): void;
export declare function validateMcuResultStatusTransition(from: OhMcuResultStatus, to: OhMcuResultStatus): void;
export declare function requiresFitToWorkAssessment(overallMcuResult: OhMcuResultOverall): boolean;
export interface PreEmploymentClearanceInput {
    mcuScheduleStatus: OhMcuScheduleStatus;
    hasMcuResult: boolean;
    fitStatus: OhFitStatus | null;
}
export declare function isPreEmploymentClearanceComplete(input: PreEmploymentClearanceInput): boolean;
export declare const MCU_REMINDER_LEAD_DAYS = 14;
export declare function isMcuReminderDue(scheduledDate: Date, now: Date, reminderSentAt: Date | null): boolean;
