import { ListQueryDto } from "../../../platform/common/list-query.dto";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class AssetController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: ListQueryDto): Promise<{
        data: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            departmentId: string | null;
            siteId: string;
            deletedAt: Date | null;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
            assetCategoryId: string;
            assetCode: string;
            assetName: string;
            manufacturer: string | null;
            modelNumber: string | null;
            serialNumber: string | null;
            purchaseDate: Date | null;
            isSafetyCritical: boolean;
            lifecycleStatus: import("@prisma/client").$Enums.AssetLifecycleStatus;
            conditionStatus: import("@prisma/client").$Enums.AssetConditionStatus;
            disposalWorkflowInstanceId: string | null;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    getById(id: string): Promise<{
        data: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            departmentId: string | null;
            siteId: string;
            deletedAt: Date | null;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
            assetCategoryId: string;
            assetCode: string;
            assetName: string;
            manufacturer: string | null;
            modelNumber: string | null;
            serialNumber: string | null;
            purchaseDate: Date | null;
            isSafetyCritical: boolean;
            lifecycleStatus: import("@prisma/client").$Enums.AssetLifecycleStatus;
            conditionStatus: import("@prisma/client").$Enums.AssetConditionStatus;
            disposalWorkflowInstanceId: string | null;
        };
    }>;
}
