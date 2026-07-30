import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";

/**
 * PRD §8 baris 5 — "restricted_duty_assignments mendekati end_date | OH
 * Staff, Supervisor terkait | In-app" — diimplementasikan berbasis
 * fit_to_work_assessments.next_reassessment_date (§4.2 poin 4: "next_
 * reassessment_date memicu reminder otomatis") krn restricted_duty_
 * assignments SENDIRI tidak punya kolom reassessment (hanya start_date/
 * end_date operasional) — nextReassessmentDate ADALAH sumber tunggal
 * tanggal reassessment kelaikan kerja di skema ini, gap TDD §26. Supervisor
 * "terkait" = assignedBy pada restricted_duty_assignments TERTAUT (kalau ada).
 */
@Injectable()
export class OccupationalHealthReassessmentScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM fit_to_work_assessments
      WHERE status = 'ACTIVE' AND next_reassessment_date IS NOT NULL AND reassessment_reminder_sent_at IS NULL
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "occupational-health-reassessment-scan gagal untuk satu tenant", {
          module: "occupational_health",
          action: "occupational-health-reassessment-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const notifications = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const due = await tx.fitToWorkAssessment.findMany({
          where: { tenantId, status: "ACTIVE", nextReassessmentDate: { lte: now }, reassessmentReminderSentAt: null, deletedAt: null },
          select: { id: true, employeeUserId: true, linkedRestrictedDutyAssignmentId: true },
        });
        if (due.length === 0) return [];

        await tx.fitToWorkAssessment.updateMany({
          where: { id: { in: due.map((d) => d.id) } },
          data: { reassessmentReminderSentAt: now },
        });

        this.logger.event("info", "occupational-health-reassessment-scan: reminder diproses", {
          module: "occupational_health",
          action: "occupational-health-reassessment-scan.processed",
          tenant_id: tenantId,
          due_count: due.length,
        });

        const ohStaff = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "OCCUPATIONAL_HEALTH_STAFF" } } } },
          select: { id: true },
        });
        const ohStaffIds = ohStaff.map((u) => u.id);

        const results = [];
        for (const d of due) {
          const recipientIds = new Set(ohStaffIds);
          if (d.linkedRestrictedDutyAssignmentId) {
            const assignment = await tx.restrictedDutyAssignment.findUnique({
              where: { id: d.linkedRestrictedDutyAssignmentId },
              select: { assignedBy: true },
            });
            if (assignment) recipientIds.add(assignment.assignedBy);
          }
          results.push({ fitToWorkAssessmentId: d.id, recipientUserIds: Array.from(recipientIds) });
        }
        return results;
      }),
    );

    for (const n of notifications) {
      for (const recipientUserId of n.recipientUserIds) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.notificationService.enqueue({
            eventType: "OCCUPATIONAL_HEALTH_REASSESSMENT_DUE",
            entityType: "FIT_TO_WORK_ASSESSMENT",
            entityId: n.fitToWorkAssessmentId,
            recipientUserId,
            priority: "MEDIUM",
            eventCategory: "OCCUPATIONAL_HEALTH",
            variables: {},
          }),
        );
      }
    }
  }
}
