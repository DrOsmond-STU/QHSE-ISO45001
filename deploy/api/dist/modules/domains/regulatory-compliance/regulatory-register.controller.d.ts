import { ListQueryDto } from "../../../platform/common/list-query.dto";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class RegulatoryRegisterController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: ListQueryDto): Promise<{
        data: {
            status: import("@prisma/client").$Enums.RegulatoryRegisterStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            title: string;
            deletedAt: Date | null;
            nextReviewDate: Date | null;
            issuingAuthority: string | null;
            issueDate: Date | null;
            effectiveDate: Date | null;
            reviewCycleMonths: number | null;
            regulationNumber: string;
            supersededByRegisterId: string | null;
            frameworkId: string | null;
            regulationType: import("@prisma/client").$Enums.RegulationType;
            applicableScope: import("@prisma/client").$Enums.ComplianceApplicableScope;
            applicableCompanyId: string | null;
            applicableSiteId: string | null;
            industryRelevance: import("@prisma/client/runtime/library").JsonValue;
            summary: string | null;
            sourceUrl: string | null;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    getById(id: string): Promise<{
        data: {
            status: import("@prisma/client").$Enums.RegulatoryRegisterStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            title: string;
            deletedAt: Date | null;
            nextReviewDate: Date | null;
            issuingAuthority: string | null;
            issueDate: Date | null;
            effectiveDate: Date | null;
            reviewCycleMonths: number | null;
            regulationNumber: string;
            supersededByRegisterId: string | null;
            frameworkId: string | null;
            regulationType: import("@prisma/client").$Enums.RegulationType;
            applicableScope: import("@prisma/client").$Enums.ComplianceApplicableScope;
            applicableCompanyId: string | null;
            applicableSiteId: string | null;
            industryRelevance: import("@prisma/client/runtime/library").JsonValue;
            summary: string | null;
            sourceUrl: string | null;
        };
    }>;
}
