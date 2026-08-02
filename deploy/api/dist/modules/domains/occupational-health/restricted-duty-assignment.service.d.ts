import { OhRestrictedDutyStatus, OhRestrictionType, RestrictedDutyAssignment } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateRestrictedDutyAssignmentInput {
    siteId: string;
    departmentId: string;
    employeeUserId: string;
    fitToWorkAssessmentId: string;
    restrictionType: OhRestrictionType;
    alternativeTaskDescription: string;
    startDate: Date;
    endDate?: Date;
}
export declare class RestrictedDutyAssignmentService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateRestrictedDutyAssignmentInput): Promise<RestrictedDutyAssignment>;
    confirmCompliance(id: string): Promise<RestrictedDutyAssignment>;
    transitionStatus(id: string, to: OhRestrictedDutyStatus): Promise<RestrictedDutyAssignment>;
    getById(id: string): Promise<RestrictedDutyAssignment>;
    listByEmployee(employeeUserId: string): Promise<RestrictedDutyAssignment[]>;
    listBySite(siteId: string, status?: OhRestrictedDutyStatus): Promise<RestrictedDutyAssignment[]>;
}
