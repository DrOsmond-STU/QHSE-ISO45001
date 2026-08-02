import { QualityNcrDisposition, QualityNcrReInspectionResult, QualityNcrSeverity, QualityNcrStatus } from "@prisma/client";
export declare function validateNcrStatusTransition(from: QualityNcrStatus, to: QualityNcrStatus): void;
export declare function assertCapaRequiredBeforeClose(severity: QualityNcrSeverity, capaRegisterId: string | null): void;
export declare function assertReInspectionPassedBeforeClose(disposition: QualityNcrDisposition, reInspectionResult: QualityNcrReInspectionResult | null): void;
export declare function resolveReInspectionRequired(disposition: QualityNcrDisposition): boolean;
