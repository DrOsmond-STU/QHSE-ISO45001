import { QualityComplaintSeverity, QualityComplaintStatus } from "@prisma/client";
export declare function validateComplaintStatusTransition(from: QualityComplaintStatus, to: QualityComplaintStatus): void;
export declare function assertCapaRequiredForCategory(severity: QualityComplaintSeverity, capaRegisterId: string | null): void;
export declare function isInitialResponseOverdue(dueDate: Date, sentAt: Date | null, now: Date): boolean;
