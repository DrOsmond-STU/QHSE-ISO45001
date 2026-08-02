import { MaintenanceIntervalType, MaintenanceSchedule } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateMaintenanceScheduleInput {
    assetId: string;
    maintenanceType: string;
    intervalType: MaintenanceIntervalType;
    intervalValue: number;
    nextDueDate: Date;
    responsibleRoleId?: string;
}
export type UpdateMaintenanceScheduleInput = Partial<Omit<CreateMaintenanceScheduleInput, "assetId">> & {
    isActive?: boolean;
};
export declare class MaintenanceScheduleService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateMaintenanceScheduleInput): Promise<MaintenanceSchedule>;
    update(id: string, input: UpdateMaintenanceScheduleInput): Promise<MaintenanceSchedule>;
    listDueByAsset(assetId: string): Promise<MaintenanceSchedule[]>;
}
