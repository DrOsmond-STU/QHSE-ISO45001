import { ListQueryDto } from "../../../platform/common/list-query.dto";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class CapaRegisterController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: ListQueryDto): Promise<{
        data: {
            status: import("@prisma/client").$Enums.CapaRegisterStatus;
            priority: import("@prisma/client").$Enums.CapaPriority;
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
            companyId: string;
            branchId: string | null;
            workflowInstanceId: string | null;
            targetClosureDate: Date | null;
            category: import("@prisma/client").$Enums.CapaCategory;
            actualClosureDate: Date | null;
            customFields: import("@prisma/client/runtime/library").JsonValue;
            capaNumber: string;
            sourceType: import("@prisma/client").$Enums.CapaSourceType;
            sourceId: string | null;
            sourceReferenceNumber: string | null;
            problemStatement: string;
            initiatedBy: string;
            initiatedAt: Date;
            rootCauseSlaReminderSentAt: Date | null;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    getById(id: string): Promise<{
        data: {
            status: import("@prisma/client").$Enums.CapaRegisterStatus;
            priority: import("@prisma/client").$Enums.CapaPriority;
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
            companyId: string;
            branchId: string | null;
            workflowInstanceId: string | null;
            targetClosureDate: Date | null;
            category: import("@prisma/client").$Enums.CapaCategory;
            actualClosureDate: Date | null;
            customFields: import("@prisma/client/runtime/library").JsonValue;
            capaNumber: string;
            sourceType: import("@prisma/client").$Enums.CapaSourceType;
            sourceId: string | null;
            sourceReferenceNumber: string | null;
            problemStatement: string;
            initiatedBy: string;
            initiatedAt: Date;
            rootCauseSlaReminderSentAt: Date | null;
        };
    }>;
}
