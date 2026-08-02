import { ContractorPqDocumentStatus, ContractorStatus, ContractorEvaluationRating } from "@prisma/client";
export declare function isContractorEligibleForAssignment(status: ContractorStatus): boolean;
export declare function hasBlockingExpiredCompliance(complianceStatuses: string[]): boolean;
export declare function isWorkerEligibleForActiveStatus(siteInductionCompleted: boolean): boolean;
export declare function isPtk007ComplianceSatisfied(isOilGasTenant: boolean, complianceDocs: Array<{
    category: string;
    isMandatoryForPtk007: boolean;
}>): boolean;
export declare function areMandatoryDocumentsVerified(documents: Array<{
    isMandatory: boolean;
    status: ContractorPqDocumentStatus;
}>): boolean;
export declare function isBlacklistTransition(newStatus: ContractorStatus): boolean;
export declare function isConsecutiveUnacceptable(currentRating: ContractorEvaluationRating, previousRating: ContractorEvaluationRating | null): boolean;
export declare function isWithinComplianceReminderWindow(expiryDate: Date, now: Date, reminderDaysBefore: number): boolean;
export declare function isComplianceExpired(expiryDate: Date, now: Date): boolean;
export declare function calculateDaysUntilExpiry(expiryDate: Date, now: Date): number;
