import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../../platform/notification/notification.service";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../../platform/tenancy/tenant-context";
import { findHiraAssessmentsDueForReviewReminder, HiraReviewDueCandidate } from "./hira-review-due-scan";

// TDD §13.1/§9 pola job cross-tenant. PRD §8 baris 2 — "Mendekati
// review_due_date HIRA -> Pemilik HIRA." "Pemilik HIRA" dibaca sbg
// hira_assessments.created_by — skema §5 TIDAK py kolom "owner_user_id"
// terpisah utk HIRA (beda dari documents.owner_user_id 2.1), createdBy
// adalah referensi user LANGSUNG paling dekat maknanya "pemilik" (penulis/
// penanggung jawab assessment) yang tersedia.
@Injectable()
export class HiraReviewDueScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM hira_assessments WHERE status = 'ACTIVE' AND review_due_date IS NOT NULL
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "hira-review-due-scan gagal untuk satu tenant", {
          module: "risk-management",
          action: "hira-review-due-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const notifications = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const hiras = await tx.hiraAssessment.findMany({ where: { status: "ACTIVE", reviewDueDate: { not: null }, deletedAt: null } });
        if (hiras.length === 0) return [];

        const candidates: HiraReviewDueCandidate[] = hiras.map((h) => ({
          hiraId: h.id,
          reviewDueDate: h.reviewDueDate,
          status: h.status,
          reviewReminderSentAt: h.reviewReminderSentAt,
        }));
        const dueIds = findHiraAssessmentsDueForReviewReminder(candidates, now).map((c) => c.hiraId);
        if (dueIds.length === 0) return [];

        await tx.hiraAssessment.updateMany({ where: { id: { in: dueIds } }, data: { reviewReminderSentAt: now } });

        this.logger.event("info", "hira-review-due-scan: reminder diproses", {
          module: "risk-management",
          action: "hira-review-due-scan.processed",
          tenant_id: tenantId,
          reminder_count: dueIds.length,
        });

        const byId = new Map(hiras.map((h) => [h.id, h]));
        return dueIds.map((hiraId) => {
          const hira = byId.get(hiraId)!;
          return {
            hiraId,
            recipientUserId: hira.createdBy,
            hiraNumber: hira.hiraNumber,
            reviewDueDate: hira.reviewDueDate!.toISOString().slice(0, 10),
          };
        });
      }),
    );

    for (const n of notifications) {
      await tenantContextStorage.run({ tenantId }, () =>
        this.notificationService.enqueue({
          eventType: "HIRA_REVIEW_DUE",
          entityType: "HIRA_ASSESSMENT",
          entityId: n.hiraId,
          recipientUserId: n.recipientUserId,
          priority: "MEDIUM",
          eventCategory: "RISK",
          variables: { hiraNumber: n.hiraNumber, reviewDueDate: n.reviewDueDate },
        }),
      );
    }
  }
}
