import { ComplianceEvaluationStatus, ComplianceStatus, ObligationFrequency } from "@prisma/client";
export declare function validateComplianceEvaluationStatusTransition(from: ComplianceEvaluationStatus, to: ComplianceEvaluationStatus): void;
export declare function assertCanCloseEvaluation(complianceStatus: ComplianceStatus, linkedCapaId: string | null): void;
export declare function computeNextObligationDueDate(closedAt: Date, frequency: ObligationFrequency): Date | null;
