import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { findOverdueInspectionRecords, RecordOverdueCandidate } from "./inspection-record-overdue-scan";

// TDD §13.1/§9 pola job cross-tenant (sama persis scan job modul lain).
// BR-06 (reinterpretasi level-record, lihat banner comment
// inspection-record-overdue-scan.ts) — status menjadi guard idempotency
// alami (baris OVERDUE keluar dari filter status IN (SCHEDULED,IN_PROGRESS)
// scan berikutnya, sampai Inspector start()/complete() memindahkannya).
@Injectable()
export class InspectionRecordOverdueScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM inspection_records WHERE status IN ('SCHEDULED', 'IN_PROGRESS')
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "inspection-record-overdue-scan gagal untuk satu tenant", {
          module: "inspection",
          action: "inspection-record-overdue-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const { overdueIds, hseManagerIds } = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const records = await tx.inspectionRecord.findMany({
          where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] }, deletedAt: null },
          select: { id: true, plannedDate: true },
        });
        if (records.length === 0) return { overdueIds: [] as string[], hseManagerIds: [] as string[] };

        const candidates: RecordOverdueCandidate[] = records.map((r) => ({ recordId: r.id, plannedDate: r.plannedDate }));
        const overdueIds = findOverdueInspectionRecords(candidates, now).map((c) => c.recordId);
        if (overdueIds.length === 0) return { overdueIds: [] as string[], hseManagerIds: [] as string[] };

        await tx.inspectionRecord.updateMany({ where: { id: { in: overdueIds } }, data: { status: "OVERDUE" } });

        const hseManagers = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
          select: { id: true },
        });

        this.logger.event("info", "inspection-record-overdue-scan: transisi diproses", {
          module: "inspection",
          action: "inspection-record-overdue-scan.processed",
          tenant_id: tenantId,
          overdue_count: overdueIds.length,
        });

        return { overdueIds, hseManagerIds: hseManagers.map((m) => m.id) };
      }),
    );

    for (const recordId of overdueIds) {
      const record = await tenantContextStorage.run({ tenantId }, () =>
        this.prisma.withRls((tx) =>
          tx.inspectionRecord.findUniqueOrThrow({ where: { id: recordId }, select: { inspectionRecordNumber: true, inspectorId: true } }),
        ),
      );
      const recipients = new Set([record.inspectorId, ...hseManagerIds]);
      for (const recipientUserId of recipients) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.notificationService.enqueue({
            eventType: "INSPECTION_RECORD_OVERDUE",
            entityType: "INSPECTION_RECORD",
            entityId: recordId,
            recipientUserId,
            priority: "HIGH",
            eventCategory: "INSPECTION",
            variables: { inspectionRecordNumber: record.inspectionRecordNumber ?? recordId },
          }),
        );
      }
    }
  }
}
