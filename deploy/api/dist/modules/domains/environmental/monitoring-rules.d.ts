import { EnvComplianceStatus, EnvMonitoringRecordStatus } from "@prisma/client";
export declare function calculateComplianceStatus(resultValue: number, bakuMutuMin: number | null, bakuMutuMax: number | null): EnvComplianceStatus;
export declare function assertLabReportAttachedBeforeVerified(hasLabReportAttachment: boolean): void;
export declare function validateMonitoringRecordStatusTransition(from: EnvMonitoringRecordStatus, to: EnvMonitoringRecordStatus): void;
