import { QualitySupplierRating, QualitySupplierRecordStatus } from "@prisma/client";
export declare function validateSupplierRecordStatusTransition(from: QualitySupplierRecordStatus, to: QualitySupplierRecordStatus): void;
export declare function assertCapaRequiredForRating(rating: QualitySupplierRating, capaRegisterId: string | null): void;
