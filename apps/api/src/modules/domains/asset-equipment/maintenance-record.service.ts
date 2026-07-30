import { Injectable } from "@nestjs/common";
import { AssetConditionStatus, MaintenanceRecord } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { AssetService } from "./asset.service";
import { requireActorUserId, requireTenantId } from "./asset-equipment-context";
import { calculateNextDueDate } from "./asset-lifecycle";

export interface CreateMaintenanceRecordInput {
  assetId: string;
  maintenanceScheduleId?: string;
  performedDate: Date;
  performedBy: string;
  findings?: string;
  resultCondition: AssetConditionStatus;
  cost?: number;
}

@Injectable()
export class MaintenanceRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetService: AssetService,
  ) {}

  async create(input: CreateMaintenanceRecordInput): Promise<MaintenanceRecord> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    const record = await this.prisma.withRls((tx) =>
      tx.maintenanceRecord.create({
        data: {
          tenantId,
          assetId: input.assetId,
          maintenanceScheduleId: input.maintenanceScheduleId,
          performedDate: input.performedDate,
          performedBy: input.performedBy,
          findings: input.findings,
          resultCondition: input.resultCondition,
          cost: input.cost,
          createdBy: actorUserId,
        },
      }),
    );

    // PRD §5 maintenance_records "Update assets.condition_status".
    const asset = await this.prisma.withRls((tx) =>
      tx.asset.update({ where: { id: input.assetId }, data: { conditionStatus: input.resultCondition, updatedBy: actorUserId } }),
    );

    // PRD §5 maintenance_schedules.next_due_date "Dihitung otomatis dari
    // maintenance terakhir" — recompute HANYA kalau record ini tertaut ke
    // schedule (non-terjadwal/korektif ringan, maintenanceScheduleId null,
    // TIDAK mengubah jadwal apa pun, PRD §5 literal).
    if (input.maintenanceScheduleId) {
      const schedule = await this.prisma.withRls((tx) => tx.maintenanceSchedule.findUniqueOrThrow({ where: { id: input.maintenanceScheduleId! } }));
      const nextDueDate = calculateNextDueDate(input.performedDate, schedule.intervalType, schedule.intervalValue);
      if (nextDueDate) {
        // Siklus baru dimulai — reset KEDUA idempotency reminder (gap TDD
        // §26, lihat banner comment schema.prisma), atau H-7/overdue siklus
        // BERIKUTNYA tidak akan pernah terkirim (flag lama masih "sent").
        await this.prisma.withRls((tx) =>
          tx.maintenanceSchedule.update({
            where: { id: schedule.id },
            data: { nextDueDate, dueSoonReminderSentAt: null, overdueNotifiedAt: null, updatedBy: actorUserId },
          }),
        );
      }
      // RUNNING_HOURS (nextDueDate null) — jadwal dibiarkan TIDAK berubah,
      // lihat banner comment calculateNextDueDate()/CreateMaintenanceScheduleInput.
    }

    // BR-04.
    await this.assetService.alertIfOutOfServiceSafetyCritical(asset);

    return record;
  }

  async listByAsset(assetId: string): Promise<MaintenanceRecord[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.maintenanceRecord.findMany({ where: { tenantId, assetId }, orderBy: { performedDate: "desc" } }));
  }
}
