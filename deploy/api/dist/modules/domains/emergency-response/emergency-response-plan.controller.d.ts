import { ListQueryDto } from "../../../platform/common/list-query.dto";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class EmergencyResponsePlanController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: ListQueryDto): Promise<{
        data: {
            version: number;
            status: import("@prisma/client").$Enums.EmergencyPlanStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            siteId: string;
            deletedAt: Date | null;
            companyId: string;
            branchId: string | null;
            workflowInstanceId: string | null;
            approvedBy: string | null;
            approvedAt: Date | null;
            reviewedBy: string | null;
            severityLevel: import("@prisma/client").$Enums.EmergencyPlanSeverityLevel;
            effectiveDate: Date | null;
            emergencyType: import("@prisma/client").$Enums.EmergencyType;
            planNumber: string;
            planTitle: string;
            scenarioDescription: string;
            defaultMusterPointId: string | null;
            relatedDocumentId: string | null;
            reviewFrequency: import("@prisma/client").$Enums.EmergencyPlanReviewFrequency;
            lastReviewedDate: Date | null;
            nextReviewDueDate: Date | null;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    getById(id: string): Promise<{
        data: {
            version: number;
            status: import("@prisma/client").$Enums.EmergencyPlanStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            siteId: string;
            deletedAt: Date | null;
            companyId: string;
            branchId: string | null;
            workflowInstanceId: string | null;
            approvedBy: string | null;
            approvedAt: Date | null;
            reviewedBy: string | null;
            severityLevel: import("@prisma/client").$Enums.EmergencyPlanSeverityLevel;
            effectiveDate: Date | null;
            emergencyType: import("@prisma/client").$Enums.EmergencyType;
            planNumber: string;
            planTitle: string;
            scenarioDescription: string;
            defaultMusterPointId: string | null;
            relatedDocumentId: string | null;
            reviewFrequency: import("@prisma/client").$Enums.EmergencyPlanReviewFrequency;
            lastReviewedDate: Date | null;
            nextReviewDueDate: Date | null;
        };
    }>;
}
