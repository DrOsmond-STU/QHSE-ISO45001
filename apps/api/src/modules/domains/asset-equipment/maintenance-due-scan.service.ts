import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { calculateDaysOverdue, isMaintenanceDueSoon, isMaintenanceOverdue } from "./asset-lifecycle";

/**
 * PRD §8 baris 1-2 — "next_due_date mendekati (H-7)" + "Maintenance
 * terlambat (overdue)", KEDUANYA date-driven dari maintenance_schedules.next_due_date
 * yang SAMA, digabung SATU scan pass (pola beda dari modul lain yang selalu
 * satu event per scan job — di sini dua event literal PRD berbagi satu
 * kolom tanggal sumber, jadi satu query cukup). Struktur pola PERSIS
 * WasteStorageDurationScanService (5.2): idempotency updateMany DI DALAM
 * transaksi withRls, enqueue() loop DI LUAR (hindari nested $transaction).
 * Penerima "Facility Officer/PIC" (§8) dibaca sbg maintenance_schedules.responsible_role_id
 * kalau diisi (PRD §5 "Default PIC"), fallback SUPERVISOR (pemetaan
 * "Facility Officer" -> SUPERVISOR, pola sama Emergency Response 3.7) kalau
 * NULL — gap TDD §26 (PRD tidak eksplisit jelaskan resolusi ini).
 */
@Injectable()
export class MaintenanceDueScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM maintenance_schedules
      WHERE is_active = true AND (due_soon_reminder_sent_at IS NULL OR overdue_notified_at IS NULL)
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "maintenance-due-scan gagal untuk satu tenant", {
          module: "asset_equipment",
          action: "maintenance-due-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const notifications = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const schedules = await tx.maintenanceSchedule.findMany({
          where: {
            tenantId,
            isActive: true,
            OR: [{ dueSoonReminderSentAt: null }, { overdueNotifiedAt: null }],
          },
          include: { asset: { select: { assetName: true, assetCode: true } } },
        });

        const dueSoon = schedules.filter((s) => s.dueSoonReminderSentAt === null && isMaintenanceDueSoon(s.nextDueDate, now));
        const overdue = schedules.filter((s) => s.overdueNotifiedAt === null && isMaintenanceOverdue(s.nextDueDate, now));
        if (dueSoon.length === 0 && overdue.length === 0) return [];

        if (dueSoon.length > 0) {
          await tx.maintenanceSchedule.updateMany({ where: { id: { in: dueSoon.map((s) => s.id) } }, data: { dueSoonReminderSentAt: now } });
        }
        if (overdue.length > 0) {
          await tx.maintenanceSchedule.updateMany({ where: { id: { in: overdue.map((s) => s.id) } }, data: { overdueNotifiedAt: now } });
        }

        this.logger.event("info", "maintenance-due-scan: reminder diproses", {
          module: "asset_equipment",
          action: "maintenance-due-scan.processed",
          tenant_id: tenantId,
          due_soon_count: dueSoon.length,
          overdue_count: overdue.length,
        });

        const resolveRecipients = async (responsibleRoleId: string | null) => {
          const roleCodes = responsibleRoleId ? undefined : ["SUPERVISOR"];
          const recipients = await tx.user.findMany({
            where: {
              tenantId,
              status: "ACTIVE",
              userRoles: responsibleRoleId ? { some: { roleId: responsibleRoleId } } : { some: { role: { roleCode: { in: roleCodes! } } } },
            },
            select: { id: true },
          });
          return recipients.map((r) => r.id);
        };
        const hseManagers = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
          select: { id: true },
        });

        const result: Array<{ eventType: string; maintenanceScheduleId: string; recipientUserIds: string[]; variables: Record<string, string> }> = [];
        for (const s of dueSoon) {
          result.push({
            eventType: "ASSET_EQUIPMENT_MAINTENANCE_DUE_SOON",
            maintenanceScheduleId: s.id,
            recipientUserIds: await resolveRecipients(s.responsibleRoleId),
            variables: { assetName: s.asset.assetName, assetCode: s.asset.assetCode, dueDate: s.nextDueDate.toISOString().slice(0, 10) },
          });
        }
        for (const s of overdue) {
          const recipientUserIds = [...(await resolveRecipients(s.responsibleRoleId)), ...hseManagers.map((r) => r.id)];
          result.push({
            eventType: "ASSET_EQUIPMENT_MAINTENANCE_OVERDUE",
            maintenanceScheduleId: s.id,
            recipientUserIds: [...new Set(recipientUserIds)],
            variables: { assetName: s.asset.assetName, assetCode: s.asset.assetCode, daysOverdue: String(calculateDaysOverdue(s.nextDueDate, now)) },
          });
        }
        return result;
      }),
    );

    for (const n of notifications) {
      for (const recipientUserId of n.recipientUserIds) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.notificationService.enqueue({
            eventType: n.eventType,
            entityType: "MAINTENANCE_SCHEDULE",
            entityId: n.maintenanceScheduleId,
            recipientUserId,
            priority: n.eventType === "ASSET_EQUIPMENT_MAINTENANCE_OVERDUE" ? "HIGH" : "MEDIUM",
            eventCategory: "ASSET_EQUIPMENT",
            variables: n.variables,
          }),
        );
      }
    }
  }
}
