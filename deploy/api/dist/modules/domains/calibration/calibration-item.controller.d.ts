import { ListQueryDto } from "../../../platform/common/list-query.dto";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class CalibrationItemController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: ListQueryDto): Promise<{
        data: {
            isActive: boolean;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            departmentId: string | null;
            siteId: string;
            deletedAt: Date | null;
            assetId: string;
            equipmentTagNo: string | null;
            measurementParameter: string;
            measurementRangeMin: import("@prisma/client/runtime/library").Decimal | null;
            measurementRangeMax: import("@prisma/client/runtime/library").Decimal | null;
            measurementRangeUnit: string | null;
            accuracyClass: string | null;
            resolution: string | null;
            calibrationIntervalMonths: number;
            calibrationMethodStandard: string | null;
            isCriticalMeasurement: boolean;
            calibrationStatus: import("@prisma/client").$Enums.CalibrationItemStatus;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    getById(id: string): Promise<{
        data: {
            isActive: boolean;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            departmentId: string | null;
            siteId: string;
            deletedAt: Date | null;
            assetId: string;
            equipmentTagNo: string | null;
            measurementParameter: string;
            measurementRangeMin: import("@prisma/client/runtime/library").Decimal | null;
            measurementRangeMax: import("@prisma/client/runtime/library").Decimal | null;
            measurementRangeUnit: string | null;
            accuracyClass: string | null;
            resolution: string | null;
            calibrationIntervalMonths: number;
            calibrationMethodStandard: string | null;
            isCriticalMeasurement: boolean;
            calibrationStatus: import("@prisma/client").$Enums.CalibrationItemStatus;
        };
    }>;
}
