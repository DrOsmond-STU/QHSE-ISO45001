import { InspectionRecurrencePattern, InspectionSchedule } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateInspectionScheduleInput {
    inspectionChecklistTemplateId: string;
    siteId: string;
    departmentId?: string;
    recurrencePattern: InspectionRecurrencePattern;
    recurrenceDetail?: string;
    defaultAssignedInspectorId?: string;
    startDate?: Date;
    endDate?: Date;
    nextGenerationDate: Date;
}
export declare class InspectionScheduleService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateInspectionScheduleInput): Promise<InspectionSchedule>;
    getById(inspectionScheduleId: string): Promise<InspectionSchedule>;
    deactivate(inspectionScheduleId: string): Promise<InspectionSchedule>;
}
