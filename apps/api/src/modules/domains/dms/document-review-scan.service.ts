import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { findOverdueReviewSchedules, findReviewsDueForReminder, ReviewScheduleCandidate } from "./review-schedule-scan";

// TDD §13.1/§9 pola job cross-tenant (sama persis WorkflowSlaScanService 0.9/
// ReminderScanService 1.1): bootstrap read-only via role admin, tiap tenant
// diproses lewat tenantContextStorage+withRls() (RLS penuh).
//
// PRD §4.3 poin 2 (H-30 reminder) + BR-06 (overdue) DIGABUNG SATU scan (pola
// sama delegation-scan 1.4 yang menggabung BR-08+task-rerouting) — keduanya
// operasi atas TABEL yang SAMA (document_review_schedule), bukan 2 konsep
// terpisah. Satu row BISA masuk KEDUA kandidat sekaligus (job yang lama
// absen: sudah lewat due date DAN belum pernah dapat reminder) — dedup ke
// SATU notifikasi per row per scan pass, BUKAN dua.
@Injectable()
export class DocumentReviewScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM document_review_schedule WHERE status IN ('SCHEDULED', 'IN_PROGRESS')
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "document-review-scan gagal untuk satu tenant", {
          module: "dms",
          action: "document-review-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const notifications = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const schedules = await tx.documentReviewSchedule.findMany({
          where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
          include: { document: { select: { title: true, ownerUserId: true } } },
        });

        const candidates: ReviewScheduleCandidate[] = schedules.map((s) => ({
          reviewScheduleId: s.id,
          scheduledReviewDate: s.scheduledReviewDate,
          actualReviewDate: s.actualReviewDate,
          reviewReminderSentAt: s.reviewReminderSentAt,
        }));

        const dueForReminderIds = new Set(findReviewsDueForReminder(candidates, now).map((c) => c.reviewScheduleId));
        const overdueIds = new Set(findOverdueReviewSchedules(candidates, now).map((c) => c.reviewScheduleId));
        const toNotifyIds = new Set([...dueForReminderIds, ...overdueIds]);
        if (toNotifyIds.size === 0) {
          return [];
        }

        if (dueForReminderIds.size > 0) {
          await tx.documentReviewSchedule.updateMany({
            where: { id: { in: [...dueForReminderIds] } },
            data: { reviewReminderSentAt: now },
          });
        }
        if (overdueIds.size > 0) {
          await tx.documentReviewSchedule.updateMany({
            where: { id: { in: [...overdueIds] } },
            data: { status: "OVERDUE" },
          });
        }

        this.logger.event("info", "document-review-scan: reminder/overdue diproses", {
          module: "dms",
          action: "document-review-scan.processed",
          tenant_id: tenantId,
          reminder_count: dueForReminderIds.size,
          overdue_count: overdueIds.size,
        });

        const byId = new Map(schedules.map((s) => [s.id, s]));
        return [...toNotifyIds].map((id) => {
          const schedule = byId.get(id)!;
          return {
            documentId: schedule.documentId,
            recipientUserId: schedule.document.ownerUserId,
            title: schedule.document.title,
            scheduledReviewDate: schedule.scheduledReviewDate.toISOString().slice(0, 10),
          };
        });
      }),
    );

    // NotificationService.enqueue() membuka withRls()-nya sendiri —
    // dipanggil SETELAH transaksi di atas commit, pola sama seluruh call
    // site lain modul ini.
    for (const n of notifications) {
      await tenantContextStorage.run({ tenantId }, () =>
        this.notificationService.enqueue({
          eventType: "DOCUMENT_REVIEW_DUE",
          entityType: "DOCUMENT",
          entityId: n.documentId,
          recipientUserId: n.recipientUserId,
          priority: "MEDIUM",
          eventCategory: "DOCUMENT",
          variables: { title: n.title, scheduledReviewDate: n.scheduledReviewDate },
        }),
      );
    }
  }
}
