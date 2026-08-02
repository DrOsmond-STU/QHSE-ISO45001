import { AssetConditionStatus, MaintenanceRecord } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { AssetService } from "./asset.service";
export interface CreateMaintenanceRecordInput {
    assetId: string;
    maintenanceScheduleId?: string;
    performedDate: Date;
    performedBy: string;
    findings?: string;
    resultCondition: AssetConditionStatus;
    cost?: number;
}
export declare class MaintenanceRecordService {
    private readonly prisma;
    private readonly assetService;
    constructor(prisma: PrismaService, assetService: AssetService);
    create(input: CreateMaintenanceRecordInput): Promise<MaintenanceRecord>;
    listByAsset(assetId: string): Promise<MaintenanceRecord[]>;
}
