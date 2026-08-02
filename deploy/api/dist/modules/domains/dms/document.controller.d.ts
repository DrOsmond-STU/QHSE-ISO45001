import { ListQueryDto } from "../../../platform/common/list-query.dto";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class DocumentController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: ListQueryDto): Promise<{
        data: {
            status: import("@prisma/client").$Enums.DocumentStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            title: string;
            departmentId: string | null;
            siteId: string | null;
            deletedAt: Date | null;
            companyId: string | null;
            branchId: string | null;
            classification: import("@prisma/client").$Enums.DocumentClassification;
            description: string | null;
            nextReviewDate: Date | null;
            documentNumber: string;
            documentType: import("@prisma/client").$Enums.DocumentType;
            documentCategoryId: string;
            ownerUserId: string;
            ownerDepartmentId: string | null;
            currentVersionId: string | null;
            effectiveDate: Date | null;
            reviewCycleMonths: number | null;
            retentionYears: number | null;
            relatedRegulatoryRefs: import("@prisma/client/runtime/library").JsonValue;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    getById(id: string): Promise<{
        data: {
            status: import("@prisma/client").$Enums.DocumentStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            title: string;
            departmentId: string | null;
            siteId: string | null;
            deletedAt: Date | null;
            companyId: string | null;
            branchId: string | null;
            classification: import("@prisma/client").$Enums.DocumentClassification;
            description: string | null;
            nextReviewDate: Date | null;
            documentNumber: string;
            documentType: import("@prisma/client").$Enums.DocumentType;
            documentCategoryId: string;
            ownerUserId: string;
            ownerDepartmentId: string | null;
            currentVersionId: string | null;
            effectiveDate: Date | null;
            reviewCycleMonths: number | null;
            retentionYears: number | null;
            relatedRegulatoryRefs: import("@prisma/client/runtime/library").JsonValue;
        };
    }>;
}
