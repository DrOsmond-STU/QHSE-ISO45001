import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { isStorageDurationWarningDue } from "./waste-rules";

/**
 * BR-03/PRD §8 "waste_generation_log mendekati max_storage_duration_days
 * (H-7) | TPS LB3 Officer, HSE Manager | In-app, Email". Struktur pola
 * PERSIS CapaRootCauseSlaScanService (4.2): idempotency updateMany DI
 * DALAM transaksi withRls, enqueue() loop DI LUAR (hindari nested
 * $transaction, lihat memory).
 */
@Injectable()
export class WasteStorageDurationScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM waste_generation_log
      WHERE linked_waste_manifest_id IS NULL AND storage_duration_warning_sent_at IS NULL
        AND storage_start_date IS NOT NULL AND max_storage_duration_days IS NOT NULL
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "waste-storage-duration-scan gagal untuk satu tenant", {
          module: "environmental",
          action: "waste-storage-duration-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const notifications = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const logs = await tx.wasteGenerationLog.findMany({
          where: { linkedWasteManifestId: null, storageDurationWarningSentAt: null, storageStartDate: { not: null }, maxStorageDurationDays: { not: null }, deletedAt: null },
          select: { id: true, wasteName: true, storageLocation: true, storageStartDate: true, maxStorageDurationDays: true },
        });
        const due = logs.filter((l) => isStorageDurationWarningDue(l.storageStartDate!, l.maxStorageDurationDays!, now));
        if (due.length === 0) return [];

        await tx.wasteGenerationLog.updateMany({
          where: { id: { in: due.map((d) => d.id) } },
          data: { storageDurationWarningSentAt: now },
        });

        this.logger.event("info", "waste-storage-duration-scan: reminder diproses", {
          module: "environmental",
          action: "waste-storage-duration-scan.processed",
          tenant_id: tenantId,
          due_count: due.length,
        });

        const recipients = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: { in: ["TPS_LB3_OFFICER", "HSE_MANAGER"] } } } } },
          select: { id: true },
        });
        const recipientIds = recipients.map((r) => r.id);

        return due.map((d) => ({
          wasteGenerationLogId: d.id,
          recipientUserIds: recipientIds,
          variables: { wasteName: d.wasteName, storageLocation: d.storageLocation ?? "-" },
        }));
      }),
    );

    for (const n of notifications) {
      for (const recipientUserId of n.recipientUserIds) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.notificationService.enqueue({
            eventType: "ENVIRONMENTAL_WASTE_STORAGE_DURATION_WARNING",
            entityType: "WASTE_GENERATION_LOG",
            entityId: n.wasteGenerationLogId,
            recipientUserId,
            priority: "MEDIUM",
            eventCategory: "ENVIRONMENTAL",
            variables: n.variables,
          }),
        );
      }
    }
  }
}
