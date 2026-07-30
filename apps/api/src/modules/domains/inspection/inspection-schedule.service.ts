import { Injectable } from "@nestjs/common";
import { InspectionRecurrencePattern, InspectionSchedule } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./inspection-context";

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

// Task 3.6 (Modul 08 §3 "HSE Manager | inspection.schedule.create,
// inspection.schedule.assign", §4 poin 2). BELUM ada controller HTTP.
@Injectable()
export class InspectionScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateInspectionScheduleInput): Promise<InspectionSchedule> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    const site = await this.prisma.withRls((tx) =>
      tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { companyId: true, branchId: true } }),
    );
    return this.prisma.withRls((tx) =>
      tx.inspectionSchedule.create({
        data: {
          tenantId,
          inspectionChecklistTemplateId: input.inspectionChecklistTemplateId,
          companyId: site.companyId,
          branchId: site.branchId,
          siteId: input.siteId,
          departmentId: input.departmentId,
          recurrencePattern: input.recurrencePattern,
          recurrenceDetail: input.recurrenceDetail,
          defaultAssignedInspectorId: input.defaultAssignedInspectorId,
          startDate: input.startDate,
          endDate: input.endDate,
          nextGenerationDate: input.nextGenerationDate,
          isActive: true,
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async getById(inspectionScheduleId: string): Promise<InspectionSchedule> {
    return this.prisma.withRls((tx) => tx.inspectionSchedule.findUniqueOrThrow({ where: { id: inspectionScheduleId } }));
  }

  async deactivate(inspectionScheduleId: string): Promise<InspectionSchedule> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.inspectionSchedule.update({ where: { id: inspectionScheduleId }, data: { isActive: false, updatedBy } }),
    );
  }
}
