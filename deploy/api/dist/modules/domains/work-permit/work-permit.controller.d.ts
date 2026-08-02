import { ListQueryDto } from "../../../platform/common/list-query.dto";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class WorkPermitController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: ListQueryDto): Promise<{
        data: {
            status: import("@prisma/client").$Enums.WorkPermitStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            title: string;
            departmentId: string | null;
            siteId: string;
            deletedAt: Date | null;
            companyId: string | null;
            branchId: string | null;
            workflowInstanceId: string | null;
            description: string;
            locationDetail: string | null;
            contractorCompanyId: string | null;
            customFields: import("@prisma/client/runtime/library").JsonValue;
            riskLevel: import("@prisma/client").$Enums.WorkPermitRiskLevel;
            relatedJsaId: string | null;
            permitNumber: string;
            workPermitTypeId: string;
            requesterId: string;
            plannedStartDatetime: Date;
            plannedEndDatetime: Date;
            actualStartDatetime: Date | null;
            actualEndDatetime: Date | null;
            numberOfWorkers: number | null;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    getById(id: string): Promise<{
        data: {
            status: import("@prisma/client").$Enums.WorkPermitStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            title: string;
            departmentId: string | null;
            siteId: string;
            deletedAt: Date | null;
            companyId: string | null;
            branchId: string | null;
            workflowInstanceId: string | null;
            description: string;
            locationDetail: string | null;
            contractorCompanyId: string | null;
            customFields: import("@prisma/client/runtime/library").JsonValue;
            riskLevel: import("@prisma/client").$Enums.WorkPermitRiskLevel;
            relatedJsaId: string | null;
            permitNumber: string;
            workPermitTypeId: string;
            requesterId: string;
            plannedStartDatetime: Date;
            plannedEndDatetime: Date;
            actualStartDatetime: Date | null;
            actualEndDatetime: Date | null;
            numberOfWorkers: number | null;
        };
    }>;
}
