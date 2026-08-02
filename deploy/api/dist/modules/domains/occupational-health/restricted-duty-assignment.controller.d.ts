import { ListQueryDto } from "../../../platform/common/list-query.dto";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class RestrictedDutyAssignmentController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: ListQueryDto): Promise<{
        data: {
            status: import("@prisma/client").$Enums.OhRestrictedDutyStatus;
            id: string;
            startDate: Date;
            endDate: Date | null;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            departmentId: string;
            siteId: string;
            deletedAt: Date | null;
            employeeUserId: string;
            fitToWorkAssessmentId: string;
            restrictionType: import("@prisma/client").$Enums.OhRestrictionType;
            alternativeTaskDescription: string;
            assignedBy: string;
            complianceConfirmedBySupervisor: boolean;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    getById(id: string): Promise<{
        data: {
            status: import("@prisma/client").$Enums.OhRestrictedDutyStatus;
            id: string;
            startDate: Date;
            endDate: Date | null;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            departmentId: string;
            siteId: string;
            deletedAt: Date | null;
            employeeUserId: string;
            fitToWorkAssessmentId: string;
            restrictionType: import("@prisma/client").$Enums.OhRestrictionType;
            alternativeTaskDescription: string;
            assignedBy: string;
            complianceConfirmedBySupervisor: boolean;
        };
    }>;
}
