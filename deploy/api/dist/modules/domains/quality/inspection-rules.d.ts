import { QualityInspectionDisposition, QualityInspectionResultStatus, QualityInspectionStatus, QualityInspectionType } from "@prisma/client";
export declare function validateInspectionStatusTransition(from: QualityInspectionStatus, to: QualityInspectionStatus): void;
export declare function shouldAutoCreateNcr(resultStatus: QualityInspectionResultStatus, inspectionType: QualityInspectionType): boolean;
export declare function assertDeviationApprovedBeforeClose(overallDisposition: QualityInspectionDisposition | null, deviationApproved: boolean): void;
