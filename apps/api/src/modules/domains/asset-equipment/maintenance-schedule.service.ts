import { Injectable } from "@nestjs/common";
import { MaintenanceIntervalType, MaintenanceSchedule } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./asset-equipment-context";

export interface CreateMaintenanceScheduleInput {
  assetId: string;
  maintenanceType: string;
  intervalType: MaintenanceIntervalType;
  intervalValue: number;
  // PRD §5 "Dihitung otomatis dari maintenance terakhir" mendeskripsikan
  // RECOMPUTE pasca maintenance (lihat MaintenanceRecordService), BUKAN
  // titik awal SEBELUM maintenance pertama pernah terjadi — PRD tidak
  // sediakan aturan utk kasus itu, jadi caller WAJIB memberi nextDueDate
  // awal eksplisit (mis. tanggal instalasi + interval kebijakan tenant)
  // drpd diasumsikan/diinvent (mis. "hari ini"), gap TDD §26.
  nextDueDate: Date;
  responsibleRoleId?: string;
}

export type UpdateMaintenanceScheduleInput = Partial<Omit<CreateMaintenanceScheduleInput, "assetId">> & { isActive?: boolean };

@Injectable()
export class MaintenanceScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateMaintenanceScheduleInput): Promise<MaintenanceSchedule> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    return this.prisma.withRls((tx) =>
      tx.maintenanceSchedule.create({
        data: {
          tenantId,
          assetId: input.assetId,
          maintenanceType: input.maintenanceType,
          intervalType: input.intervalType,
          intervalValue: input.intervalValue,
          nextDueDate: input.nextDueDate,
          responsibleRoleId: input.responsibleRoleId,
          isActive: true,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async update(id: string, input: UpdateMaintenanceScheduleInput): Promise<MaintenanceSchedule> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.maintenanceSchedule.update({
        where: { id },
        data: {
          maintenanceType: input.maintenanceType,
          intervalType: input.intervalType,
          intervalValue: input.intervalValue,
          nextDueDate: input.nextDueDate,
          // nextDueDate diubah manual (mis. ditunda) — siklus reminder ikut
          // reset, pola sama MaintenanceRecordService.create() (gap TDD §26).
          dueSoonReminderSentAt: input.nextDueDate ? null : undefined,
          overdueNotifiedAt: input.nextDueDate ? null : undefined,
          responsibleRoleId: input.responsibleRoleId,
          isActive: input.isActive,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async listDueByAsset(assetId: string): Promise<MaintenanceSchedule[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.maintenanceSchedule.findMany({ where: { tenantId, assetId, isActive: true, deletedAt: null }, orderBy: { nextDueDate: "asc" } }),
    );
  }
}
