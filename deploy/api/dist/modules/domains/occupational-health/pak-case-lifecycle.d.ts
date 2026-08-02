import { OhPakCaseStatus, OhSeverityClassification, OhWorkRelatedness } from "@prisma/client";
export declare function validatePakCaseStatusTransition(from: OhPakCaseStatus, to: OhPakCaseStatus): void;
export declare function requiresTopManagementEscalation(severity: OhSeverityClassification): boolean;
export declare function requiresDisnakerReporting(workRelatedness: OhWorkRelatedness): boolean;
