import { ListQueryDto } from "../../../platform/common/list-query.dto";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class AuditController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: ListQueryDto): Promise<{
        data: {
            status: import("@prisma/client").$Enums.AuditStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            siteId: string;
            deletedAt: Date | null;
            auditChecklistId: string;
            auditNumber: string;
            auditProgramPlanItemId: string | null;
            auditTypeId: string;
            companyId: string;
            branchId: string | null;
            leadAuditorId: string;
            plannedStartDate: Date;
            plannedEndDate: Date;
            actualStartDate: Date | null;
            actualEndDate: Date | null;
            openingMeetingDatetime: Date | null;
            openingMeetingNotes: string | null;
            closingMeetingDatetime: Date | null;
            closingMeetingNotes: string | null;
            overallConclusion: string | null;
            workflowInstanceId: string | null;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    getById(id: string): Promise<{
        data: {
            status: import("@prisma/client").$Enums.AuditStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            siteId: string;
            deletedAt: Date | null;
            auditChecklistId: string;
            auditNumber: string;
            auditProgramPlanItemId: string | null;
            auditTypeId: string;
            companyId: string;
            branchId: string | null;
            leadAuditorId: string;
            plannedStartDate: Date;
            plannedEndDate: Date;
            actualStartDate: Date | null;
            actualEndDate: Date | null;
            openingMeetingDatetime: Date | null;
            openingMeetingNotes: string | null;
            closingMeetingDatetime: Date | null;
            closingMeetingNotes: string | null;
            overallConclusion: string | null;
            workflowInstanceId: string | null;
        };
    }>;
    findings(id: string): Promise<{
        data: {
            status: import("@prisma/client").$Enums.AuditFindingStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            auditId: string;
            clauseReference: string | null;
            checklistItemId: string | null;
            findingNumber: string;
            classification: import("@prisma/client").$Enums.AuditFindingClassification;
            description: string;
            evidenceDescription: string | null;
            auditeeResponse: string | null;
            requiresCapa: boolean;
            capaRegisterId: string | null;
            identifiedBy: string;
            identifiedAt: Date;
            targetClosureDate: Date | null;
            closedAt: Date | null;
        }[];
    }>;
}
