import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { AcknowledgementOverdueCandidate, findOverdueAcknowledgements } from "./read-acknowledgement-scan";

// TDD §13.1/§9 pola job cross-tenant. BR-04 (PRD §6): "Melewati
// acknowledgement_due_days tanpa acknowledge -> status -> OVERDUE, eskalasi
// notifikasi ke user & atasannya." dueAt dihitung dari PARENT
// document_distribution (distributedAt + acknowledgementDueDays) — TIDAK
// ada kolom itu di read_acknowledgement_logs sendiri (PRD §5).
@Injectable()
export class ReadAcknowledgementScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM read_acknowledgement_logs WHERE status IN ('PENDING', 'VIEWED')
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "read-acknowledgement-scan gagal untuk satu tenant", {
          module: "dms",
          action: "read-acknowledgement-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const notifications = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const logs = await tx.readAcknowledgementLog.findMany({
          where: { status: { in: ["PENDING", "VIEWED"] } },
          include: {
            documentDistribution: { select: { distributedAt: true, acknowledgementDueDays: true, requiresAcknowledgement: true } },
            documentVersion: { select: { document: { select: { title: true } } } },
            user: { select: { reportingToUserId: true } },
          },
        });

        const candidates: AcknowledgementOverdueCandidate[] = logs.map((log) => {
          const { distributedAt, acknowledgementDueDays, requiresAcknowledgement } = log.documentDistribution;
          const dueAt =
            requiresAcknowledgement && acknowledgementDueDays !== null
              ? new Date(distributedAt.getTime() + acknowledgementDueDays * 24 * 60 * 60 * 1000)
              : null;
          return { ackLogId: log.id, status: log.status, dueAt };
        });

        const overdueIds = findOverdueAcknowledgements(candidates, now).map((c) => c.ackLogId);
        if (overdueIds.length === 0) {
          return [];
        }

        await tx.readAcknowledgementLog.updateMany({ where: { id: { in: overdueIds } }, data: { status: "OVERDUE" } });

        this.logger.event("info", "read-acknowledgement-scan: BR-04 overdue diproses", {
          module: "dms",
          action: "read-acknowledgement-scan.processed",
          tenant_id: tenantId,
          overdue_count: overdueIds.length,
        });

        const byId = new Map(logs.map((l) => [l.id, l]));
        return overdueIds.flatMap((id) => {
          const log = byId.get(id)!;
          const title = log.documentVersion.document.title;
          const recipients = [log.userId, ...(log.user.reportingToUserId ? [log.user.reportingToUserId] : [])];
          return recipients.map((recipientUserId) => ({ recipientUserId, title, ackLogId: log.id }));
        });
      }),
    );

    for (const n of notifications) {
      await tenantContextStorage.run({ tenantId }, () =>
        this.notificationService.enqueue({
          eventType: "DOCUMENT_ACKNOWLEDGEMENT_OVERDUE",
          entityType: "READ_ACKNOWLEDGEMENT_LOG",
          entityId: n.ackLogId,
          recipientUserId: n.recipientUserId,
          priority: "MEDIUM",
          eventCategory: "DOCUMENT",
          variables: { title: n.title },
        }),
      );
    }
  }
}
