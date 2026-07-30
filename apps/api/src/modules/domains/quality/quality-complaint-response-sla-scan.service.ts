import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { isInitialResponseOverdue } from "./complaint-lifecycle";

/**
 * BR-02 §8 "SLA respons awal komplain terlewati | Quality Manager,
 * Customer Service Head". TIDAK ADA role baseline "Customer Service Head"
 * terpisah (lihat gap RBAC seed soal Customer Service/Sales dilipat ke
 * WORKER_EMPLOYEE) — disubstitusi `received_by` (orang yang genuinely
 * mencatat komplain ini) + QUALITY_MANAGER tenant-wide, pola sama seluruh
 * scan job lain yang mensubstitusi role PRD tanpa padanan baseline.
 */
@Injectable()
export class QualityComplaintResponseSlaScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM customer_complaints WHERE initial_response_sent_at IS NULL AND response_sla_overdue_notified_at IS NULL
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "quality-complaint-response-sla-scan gagal untuk satu tenant", {
          module: "quality",
          action: "quality-complaint-response-sla-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const notifications = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const complaints = await tx.customerComplaint.findMany({
          where: { initialResponseSentAt: null, responseSlaOverdueNotifiedAt: null, deletedAt: null },
          select: { id: true, complaintNumber: true, initialResponseDueDate: true, initialResponseSentAt: true, receivedBy: true },
        });
        if (complaints.length === 0) return [];

        const overdueIds = complaints
          .filter((c) => isInitialResponseOverdue(c.initialResponseDueDate, c.initialResponseSentAt, now))
          .map((c) => c.id);
        if (overdueIds.length === 0) return [];

        await tx.customerComplaint.updateMany({ where: { id: { in: overdueIds } }, data: { responseSlaOverdueNotifiedAt: now } });

        this.logger.event("info", "quality-complaint-response-sla-scan: reminder diproses", {
          module: "quality",
          action: "quality-complaint-response-sla-scan.processed",
          tenant_id: tenantId,
          overdue_count: overdueIds.length,
        });

        const qualityManagers = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "QUALITY_MANAGER" } } } },
          select: { id: true },
        });
        const qualityManagerIds = qualityManagers.map((m) => m.id);
        const byId = new Map(complaints.map((c) => [c.id, c]));

        return overdueIds.map((complaintId) => {
          const complaint = byId.get(complaintId)!;
          return {
            complaintId,
            recipientUserIds: [...new Set([complaint.receivedBy, ...qualityManagerIds])],
            variables: { complaintNumber: complaint.complaintNumber },
          };
        });
      }),
    );

    for (const n of notifications) {
      for (const recipientUserId of n.recipientUserIds) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.notificationService.enqueue({
            eventType: "QUALITY_COMPLAINT_RESPONSE_SLA_OVERDUE",
            entityType: "CUSTOMER_COMPLAINT",
            entityId: n.complaintId,
            recipientUserId,
            priority: "HIGH",
            eventCategory: "QUALITY",
            variables: n.variables,
          }),
        );
      }
    }
  }
}
