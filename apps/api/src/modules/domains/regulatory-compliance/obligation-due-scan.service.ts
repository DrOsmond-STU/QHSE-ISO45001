import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { findObligationsDueForReminder, findOverdueObligations, ObligationDueCandidate } from "./obligation-due-scan";

// TDD §13.1/§9 pola job cross-tenant (sama persis DocumentReviewScanService,
// 2.1). PRD §8 baris 3 (jatuh tempo H-30) + baris 5 (overdue) DIGABUNG SATU
// scan (satu tabel compliance_obligations, pola sama license-expiry-scan/
// document-review-scan).
@Injectable()
export class ObligationDueScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM compliance_obligations WHERE status = 'ACTIVE' AND next_due_date IS NOT NULL
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "obligation-due-scan gagal untuk satu tenant", {
          module: "regulatory-compliance",
          action: "obligation-due-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const notifications = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const obligations = await tx.complianceObligation.findMany({
          where: { status: "ACTIVE", nextDueDate: { not: null }, deletedAt: null },
        });
        if (obligations.length === 0) return [];

        const candidates: ObligationDueCandidate[] = obligations.map((o) => ({
          obligationId: o.id,
          nextDueDate: o.nextDueDate,
          status: o.status,
          dueReminderSentAt: o.dueReminderSentAt,
          overdueNotifiedAt: o.overdueNotifiedAt,
        }));

        const dueForReminderIds = new Set(findObligationsDueForReminder(candidates, now).map((c) => c.obligationId));
        const overdueIds = new Set(findOverdueObligations(candidates, now).map((c) => c.obligationId));

        if (dueForReminderIds.size > 0) {
          await tx.complianceObligation.updateMany({ where: { id: { in: [...dueForReminderIds] } }, data: { dueReminderSentAt: now } });
        }
        if (overdueIds.size > 0) {
          await tx.complianceObligation.updateMany({ where: { id: { in: [...overdueIds] } }, data: { overdueNotifiedAt: now } });
        }

        this.logger.event("info", "obligation-due-scan: reminder/overdue diproses", {
          module: "regulatory-compliance",
          action: "obligation-due-scan.processed",
          tenant_id: tenantId,
          reminder_count: dueForReminderIds.size,
          overdue_count: overdueIds.size,
        });

        if (dueForReminderIds.size === 0 && overdueIds.size === 0) return [];

        const hseManagers =
          overdueIds.size > 0
            ? await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
                select: { id: true },
              })
            : [];
        const hseManagerIds = hseManagers.map((m) => m.id);

        const byId = new Map(obligations.map((o) => [o.id, o]));
        const results: Array<{
          obligationId: string;
          recipientUserIds: string[];
          eventType: string;
          priority: "HIGH" | "MEDIUM";
        }> = [];

        // PRD §8 baris 3 — "Evaluator/PIC obligation" dibaca sbg
        // responsible_user_id (satu-satunya referensi user langsung pada
        // compliance_obligations — belum ada "evaluator" ditunjuk sebelum
        // evaluasi genuinely dibuat). Obligation tanpa responsible_user_id
        // (NULL) dilewati tanpa notifikasi (gap TDD §26).
        for (const obligationId of dueForReminderIds) {
          const obligation = byId.get(obligationId)!;
          if (!obligation.responsibleUserId) continue;
          results.push({
            obligationId,
            recipientUserIds: [obligation.responsibleUserId],
            eventType: "COMPLIANCE_EVALUATION_DUE",
            priority: "MEDIUM",
          });
        }

        for (const obligationId of overdueIds) {
          const obligation = byId.get(obligationId)!;
          const recipients = new Set(hseManagerIds);
          if (obligation.responsibleUserId) recipients.add(obligation.responsibleUserId);
          if (recipients.size === 0) continue;
          results.push({
            obligationId,
            recipientUserIds: [...recipients],
            eventType: "COMPLIANCE_OBLIGATION_OVERDUE",
            priority: "HIGH",
          });
        }

        return results.map((r) => {
          const obligation = byId.get(r.obligationId)!;
          return {
            ...r,
            obligationDescription: obligation.obligationDescription,
            nextDueDate: obligation.nextDueDate?.toISOString().slice(0, 10) ?? "",
          };
        });
      }),
    );

    for (const n of notifications) {
      for (const recipientUserId of n.recipientUserIds) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.notificationService.enqueue({
            eventType: n.eventType,
            entityType: "COMPLIANCE_OBLIGATION",
            entityId: n.obligationId,
            recipientUserId,
            priority: n.priority,
            eventCategory: "COMPLIANCE",
            variables: { obligationDescription: n.obligationDescription, nextDueDate: n.nextDueDate },
          }),
        );
      }
    }
  }
}
