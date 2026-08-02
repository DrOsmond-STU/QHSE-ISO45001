import { ListQueryDto } from "../../../platform/common/list-query.dto";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class IncidentReportController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: ListQueryDto): Promise<{
        data: {
            status: import("@prisma/client").$Enums.IncidentReportStatus;
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
            classification: import("@prisma/client").$Enums.IncidentClassification;
            description: string;
            incidentNumber: string;
            initialClassification: import("@prisma/client").$Enums.IncidentClassification;
            severityLevel: import("@prisma/client").$Enums.IncidentSeverityLevel;
            incidentDatetime: Date;
            reportedDatetime: Date;
            locationDetail: string | null;
            immediateActionTaken: string | null;
            reportedBy: string | null;
            isAnonymous: boolean;
            injuredPersonId: string | null;
            workPermitId: string | null;
            involvesContractor: boolean;
            contractorCompanyId: string | null;
            daysLost: number | null;
            estimatedCost: import("@prisma/client/runtime/library").Decimal | null;
            customFields: import("@prisma/client/runtime/library").JsonValue;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    getById(id: string): Promise<{
        data: {
            status: import("@prisma/client").$Enums.IncidentReportStatus;
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
            classification: import("@prisma/client").$Enums.IncidentClassification;
            description: string;
            incidentNumber: string;
            initialClassification: import("@prisma/client").$Enums.IncidentClassification;
            severityLevel: import("@prisma/client").$Enums.IncidentSeverityLevel;
            incidentDatetime: Date;
            reportedDatetime: Date;
            locationDetail: string | null;
            immediateActionTaken: string | null;
            reportedBy: string | null;
            isAnonymous: boolean;
            injuredPersonId: string | null;
            workPermitId: string | null;
            involvesContractor: boolean;
            contractorCompanyId: string | null;
            daysLost: number | null;
            estimatedCost: import("@prisma/client/runtime/library").Decimal | null;
            customFields: import("@prisma/client/runtime/library").JsonValue;
        };
    }>;
}
