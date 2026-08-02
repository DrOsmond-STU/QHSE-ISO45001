import { OhAccessEntityType, OhAccessReason, OhAccessType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface RecordAccessInput {
    subjectEmployeeUserId: string;
    accessedEntityType: OhAccessEntityType;
    accessedEntityId: string;
    accessType: OhAccessType;
    reasonForAccess: OhAccessReason;
    reasonNotes?: string;
}
export declare class MedicalRecordAccessLogService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    recordAccess(input: RecordAccessInput): Promise<void>;
}
