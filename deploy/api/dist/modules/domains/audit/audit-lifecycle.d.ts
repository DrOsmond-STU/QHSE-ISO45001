import { AuditFindingClassification, AuditStatus } from "@prisma/client";
export declare function validateAuditStatusTransition(from: AuditStatus, to: AuditStatus): void;
export declare function computeTargetClosureDate(identifiedAt: Date, classification: AuditFindingClassification): Date | null;
export interface AuditCloseGateFinding {
    requiresCapa: boolean;
    status: string;
}
export declare function assertAuditCloseAllowed(findings: AuditCloseGateFinding[], reportStatus: "APPROVED" | null): void;
