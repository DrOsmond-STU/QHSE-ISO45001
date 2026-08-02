import { DataImportJobStatus } from "@prisma/client";
export declare class DataImportLifecycleError extends Error {
}
export declare function validateDataImportJobStatusTransition(from: DataImportJobStatus, to: DataImportJobStatus): void;
export declare function assertDataImportJobIsRetryable(status: DataImportJobStatus): void;
