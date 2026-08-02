import { AuditProgramPlanItemStatus, AuditProgramStatus } from "@prisma/client";
export declare function validateAuditProgramStatusTransition(from: AuditProgramStatus, to: AuditProgramStatus): void;
export declare function validateAuditProgramPlanItemStatusTransition(from: AuditProgramPlanItemStatus, to: AuditProgramPlanItemStatus): void;
export declare function assertPlanItemEditable(status: AuditProgramPlanItemStatus): void;
