import { ListQueryDto } from "../../../../platform/common/list-query.dto";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
export declare class HiraAssessmentController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: ListQueryDto): Promise<{
        data: {
            status: import("@prisma/client").$Enums.HiraAssessmentStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            departmentId: string | null;
            siteId: string;
            deletedAt: Date | null;
            workflowInstanceId: string | null;
            assessmentType: import("@prisma/client").$Enums.HiraAssessmentType;
            assessmentDate: Date;
            reviewReminderSentAt: Date | null;
            hiraNumber: string;
            activityDescription: string;
            riskMatrixConfigId: string;
            reviewDueDate: Date | null;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    getById(id: string): Promise<{
        data: {
            status: import("@prisma/client").$Enums.HiraAssessmentStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            departmentId: string | null;
            siteId: string;
            deletedAt: Date | null;
            workflowInstanceId: string | null;
            assessmentType: import("@prisma/client").$Enums.HiraAssessmentType;
            assessmentDate: Date;
            reviewReminderSentAt: Date | null;
            hiraNumber: string;
            activityDescription: string;
            riskMatrixConfigId: string;
            reviewDueDate: Date | null;
        };
    }>;
}
