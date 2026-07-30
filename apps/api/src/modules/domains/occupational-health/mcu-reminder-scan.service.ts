import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { isMcuReminderDue } from "./mcu-lifecycle";

/**
 * PRD §8 baris 1 — "MCU jatuh tempo (H-14/H-7/H-1) | Karyawan bersangkutan,
 * Occupational Health Staff | In-app, Email". Struktur pola PERSIS
 * WasteStorageDurationScanService (5.2): idempotency updateMany DI DALAM
 * transaksi withRls, enqueue() loop DI LUAR.
 */
@Injectable()
export class McuReminderScanService implements OnModuleDestroy {
  private readonly adminPrisma: PrismaClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly logger: AppLoggerService,
  ) {
    this.adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.adminPrisma.$disconnect();
  }

  async scan(now: Date = new Date()): Promise<void> {
    const rows = await this.adminPrisma.$queryRaw<Array<{ tenant_id: string }>>`
      SELECT DISTINCT tenant_id FROM mcu_schedules
      WHERE reminder_sent_at IS NULL AND status IN ('SCHEDULED', 'RESCHEDULED')
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "mcu-reminder-scan gagal untuk satu tenant", {
          module: "occupational_health",
          action: "mcu-reminder-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const notifications = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const schedules = await tx.mcuSchedule.findMany({
          where: { tenantId, reminderSentAt: null, status: { in: ["SCHEDULED", "RESCHEDULED"] }, deletedAt: null },
          select: { id: true, employeeUserId: true, scheduledDate: true },
        });
        const due = schedules.filter((s) => isMcuReminderDue(s.scheduledDate, now, null));
        if (due.length === 0) return [];

        await tx.mcuSchedule.updateMany({
          where: { id: { in: due.map((d) => d.id) } },
          data: { reminderSentAt: now },
        });

        this.logger.event("info", "mcu-reminder-scan: reminder diproses", {
          module: "occupational_health",
          action: "mcu-reminder-scan.processed",
          tenant_id: tenantId,
          due_count: due.length,
        });

        const ohStaff = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "OCCUPATIONAL_HEALTH_STAFF" } } } },
          select: { id: true },
        });
        const ohStaffIds = ohStaff.map((u) => u.id);

        return due.map((d) => ({
          mcuScheduleId: d.id,
          employeeUserId: d.employeeUserId,
          recipientUserIds: [d.employeeUserId, ...ohStaffIds],
          scheduledDate: d.scheduledDate.toISOString().slice(0, 10),
        }));
      }),
    );

    for (const n of notifications) {
      for (const recipientUserId of n.recipientUserIds) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.notificationService.enqueue({
            eventType: "OCCUPATIONAL_HEALTH_MCU_DUE",
            entityType: "MCU_SCHEDULE",
            entityId: n.mcuScheduleId,
            recipientUserId,
            priority: "MEDIUM",
            eventCategory: "OCCUPATIONAL_HEALTH",
            variables: { scheduledDate: n.scheduledDate },
          }),
        );
      }
    }
  }
}
