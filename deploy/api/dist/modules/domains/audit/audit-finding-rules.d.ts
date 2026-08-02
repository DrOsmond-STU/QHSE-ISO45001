import { AuditFindingClassification, AuditFindingStatus } from "@prisma/client";
export declare function resolveDefaultRequiresCapa(classification: AuditFindingClassification): boolean;
export declare function validateAuditFindingStatusTransition(from: AuditFindingStatus, to: AuditFindingStatus, requiresCapa: boolean): void;
