import { Asset, AssetConditionStatus, AssetLifecycleStatus, NumberingConfig } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateAssetInput {
    siteId: string;
    departmentId?: string;
    assetCategoryId: string;
    assetName: string;
    manufacturer?: string;
    modelNumber?: string;
    serialNumber?: string;
    purchaseDate?: Date;
    isSafetyCritical?: boolean;
    customFields?: unknown;
}
export interface UpdateAssetInput {
    departmentId?: string;
    assetName?: string;
    manufacturer?: string;
    modelNumber?: string;
    serialNumber?: string;
    isSafetyCritical?: boolean;
    conditionStatus?: AssetConditionStatus;
    customFields?: unknown;
}
export declare class AssetService {
    private readonly prisma;
    private readonly numbering;
    private readonly notificationService;
    constructor(prisma: PrismaService, numbering: NumberingService, notificationService: NotificationService);
    ensureNumberingConfig(siteId: string): Promise<NumberingConfig>;
    create(input: CreateAssetInput): Promise<Asset>;
    update(id: string, input: UpdateAssetInput): Promise<Asset>;
    deactivateSchedulesIfTerminal(assetId: string, newStatus: AssetLifecycleStatus): Promise<void>;
    assertDisposalAllowedDirectly(categoryRequiresDisposalApproval: boolean, newStatus: AssetLifecycleStatus): void;
    alertIfOutOfServiceSafetyCritical(asset: Asset): Promise<void>;
    private notifyHseManagers;
}
