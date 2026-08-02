import { ListQueryDto } from "../../../platform/common/list-query.dto";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class InspectionRecordController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: ListQueryDto): Promise<{
        data: {
            status: import("@prisma/client").$Enums.InspectionRecordStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            departmentId: string | null;
            siteId: string;
            deletedAt: Date | null;
            companyId: string | null;
            branchId: string | null;
            notes: string | null;
            customFields: import("@prisma/client/runtime/library").JsonValue;
            actualDate: Date | null;
            inspectionChecklistTemplateId: string;
            inspectionRecordNumber: string | null;
            inspectionScheduleId: string | null;
            plannedDate: Date | null;
            inspectorId: string;
            overallScore: import("@prisma/client/runtime/library").Decimal | null;
            overallResult: import("@prisma/client").$Enums.InspectionOverallResult | null;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    getById(id: string): Promise<{
        data: {
            status: import("@prisma/client").$Enums.InspectionRecordStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            departmentId: string | null;
            siteId: string;
            deletedAt: Date | null;
            companyId: string | null;
            branchId: string | null;
            notes: string | null;
            customFields: import("@prisma/client/runtime/library").JsonValue;
            actualDate: Date | null;
            inspectionChecklistTemplateId: string;
            inspectionRecordNumber: string | null;
            inspectionScheduleId: string | null;
            plannedDate: Date | null;
            inspectorId: string;
            overallScore: import("@prisma/client/runtime/library").Decimal | null;
            overallResult: import("@prisma/client").$Enums.InspectionOverallResult | null;
        };
    }>;
}
