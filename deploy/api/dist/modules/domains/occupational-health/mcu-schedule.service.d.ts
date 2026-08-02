import { McuSchedule, OhMcuScheduleStatus, OhMcuType } from "@prisma/client";
import { FieldEncryptionService } from "../../../platform/field-encryption/field-encryption.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateMcuScheduleInput {
    siteId: string;
    departmentId?: string;
    employeeUserId: string;
    mcuType: OhMcuType;
    scheduledDate: Date;
    mcuPackageCode?: string;
    mcuPackageName?: string;
    reasonForSpecial?: string;
    providerClinicName?: string;
    linkedHealthSurveillanceProgramId?: string;
}
export type DecryptedMcuSchedule = Omit<McuSchedule, "reasonForSpecialEncrypted"> & {
    reasonForSpecial: string | null;
};
export declare class McuScheduleService {
    private readonly prisma;
    private readonly fieldEncryption;
    constructor(prisma: PrismaService, fieldEncryption: FieldEncryptionService);
    create(input: CreateMcuScheduleInput): Promise<DecryptedMcuSchedule>;
    transitionStatus(id: string, to: OhMcuScheduleStatus): Promise<DecryptedMcuSchedule>;
    reschedule(id: string, newScheduledDate: Date): Promise<DecryptedMcuSchedule>;
    markReminderSent(id: string): Promise<void>;
    getById(id: string): Promise<DecryptedMcuSchedule>;
    listByEmployee(employeeUserId: string): Promise<DecryptedMcuSchedule[]>;
    listBySite(siteId: string, status?: OhMcuScheduleStatus): Promise<DecryptedMcuSchedule[]>;
    private toDecrypted;
}
