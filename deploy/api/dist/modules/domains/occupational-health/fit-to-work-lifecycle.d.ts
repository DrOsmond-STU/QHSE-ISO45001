import { OhFitStatus, OhFitToWorkAssessmentStatus, OhRestrictedDutyStatus } from "@prisma/client";
export declare function validateFitToWorkAssessmentStatusTransition(from: OhFitToWorkAssessmentStatus, to: OhFitToWorkAssessmentStatus): void;
export declare function requiresRestrictedDutyAssignment(fitStatus: OhFitStatus): boolean;
export declare function isReassessmentDue(nextReassessmentDate: Date | null, asOfDate: Date): boolean;
export declare function validateRestrictedDutyAssignmentStatusTransition(from: OhRestrictedDutyStatus, to: OhRestrictedDutyStatus): void;
