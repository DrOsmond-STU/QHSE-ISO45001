import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { InspectionRecurrencePattern, PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { InspectionRecordService } from "./inspection-record.service";
import { computeNextGenerationDate, findSchedulesDueForGeneration, ScheduleGenerationCandidate } from "./inspection-schedule-recurrence";

interface DueScheduleRow {
  id: string;
  nextGenerationDate: Date;
  recurrencePattern: InspectionRecurrencePattern;
  inspectionChecklistTemplateId: string;
  siteId: string;
  departmentId: string | null;
  defaultAssignedInspectorId: string | null;
  createdBy: string;
}

/**
 * TDD §13.1/§9 pola job cross-tenant. PRD §4 poin 2-3 — generator instance
 * inspection_records dari inspection_schedules aktif. Aktor "createdBy"
 * baris inspection_records yang digenerate = createdBy BARIS JADWAL itu
 * sendiri (siapa pun HSE Manager yang membuat jadwal) — job cross-tenant
 * TIDAK punya aktor manusia sungguhan, pola INI (bukan admin/system user
 * generik yang tidak ada di skema) dipilih krn createdBy/updatedBy WAJIB
 * FK valid ke users, gap TDD §26. Jadwal TANPA default_assigned_inspector_id
 * DILEWATI (inspector_id kolom NOT NULL, tidak bisa digenerate otomatis).
 * CUSTOM_CRON DILEWATI SELURUHNYA (bukan cuma next_generation_date-nya
 * tidak di-advance) — kalau tetap digenerate tanpa next_generation_date
 * maju, jadwal itu akan "due" lagi di scan BERIKUTNYA dan menghasilkan
 * record BARU SETIAP HARI tanpa henti; melewati generation-nya sepenuhnya
 * lebih aman drpd bug generation tak terbatas, gap TDD §26 (butuh
 * cron-expression parser, di luar cakupan task ini).
 */
@Injectable()
export class InspectionRecordGenerationScanService implements OnModuleDestroy {
  private readonly adminPrisma: PrismaClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly recordService: InspectionRecordService,
    private readonly logger: AppLoggerService,
  ) {
    this.adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.adminPrisma.$disconnect();
  }

  async scan(now: Date = new Date()): Promise<void> {
    const rows = await this.adminPrisma.$queryRaw<Array<{ tenant_id: string }>>`
      SELECT DISTINCT tenant_id FROM inspection_schedules WHERE is_active = true
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "inspection-record-generation-scan gagal untuk satu tenant", {
          module: "inspection",
          action: "inspection-record-generation-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const dueSchedules = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const schedules: DueScheduleRow[] = await tx.inspectionSchedule.findMany({
          where: { isActive: true, deletedAt: null },
          select: {
            id: true,
            nextGenerationDate: true,
            recurrencePattern: true,
            inspectionChecklistTemplateId: true,
            siteId: true,
            departmentId: true,
            defaultAssignedInspectorId: true,
            createdBy: true,
          },
        });
        const candidates: ScheduleGenerationCandidate[] = schedules.map((s) => ({
          scheduleId: s.id,
          nextGenerationDate: s.nextGenerationDate,
          isActive: true,
          startDate: null,
          endDate: null,
        }));
        const dueIds = new Set(findSchedulesDueForGeneration(candidates, now).map((c) => c.scheduleId));
        return schedules.filter((s) => dueIds.has(s.id));
      }),
    );

    let generatedCount = 0;
    for (const schedule of dueSchedules) {
      if (schedule.recurrencePattern === "CUSTOM_CRON") continue;
      const inspectorId = schedule.defaultAssignedInspectorId;
      if (!inspectorId) continue;

      await tenantContextStorage.run({ tenantId, userId: schedule.createdBy }, () =>
        this.recordService.create({
          inspectionChecklistTemplateId: schedule.inspectionChecklistTemplateId,
          inspectionScheduleId: schedule.id,
          siteId: schedule.siteId,
          departmentId: schedule.departmentId ?? undefined,
          plannedDate: schedule.nextGenerationDate,
          inspectorId,
        }),
      );
      generatedCount += 1;

      const nextGenerationDate = computeNextGenerationDate(schedule.nextGenerationDate, schedule.recurrencePattern);
      if (nextGenerationDate) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.prisma.withRls((tx) => tx.inspectionSchedule.update({ where: { id: schedule.id }, data: { nextGenerationDate } })),
        );
      }
    }

    if (generatedCount > 0) {
      this.logger.event("info", "inspection-record-generation-scan: record digenerate", {
        module: "inspection",
        action: "inspection-record-generation-scan.processed",
        tenant_id: tenantId,
        generated_count: generatedCount,
      });
    }
  }
}
