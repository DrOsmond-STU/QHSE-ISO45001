import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { findPlansWithOverdueReview, PlanReviewOverdueCandidate } from "./emergency-plan-review-overdue-scan";

/**
 * TDD §13.1/§9 pola job cross-tenant (sama persis scan job modul lain).
 * BR-01 — "status ditandai terlambat (flag dashboard) ... memicu
 * notifikasi eskalasi ke HSE Manager." TIDAK ADA transisi status di sini —
 * EmergencyPlanStatus TIDAK punya nilai enum "OVERDUE_REVIEW" apa pun
 * (skema §5 literal), jadi "flag dashboard" murni ditinjau LIVE dari
 * next_review_due_date (bukan kolom status tersimpan) — scan job ini
 * SEPENUHNYA notifikasi, pola PERSIS InspectionFindingSlaScanService (3.6)
 * "daily nag": plan yang SAMA akan terus dinotifikasi ULANG SETIAP HARI
 * sampai direview ulang (nextReviewDueDate bergeser) atau di-supersede/
 * archive — TIDAK ADA kolom idempotency, gap TDD §26.
 */
@Injectable()
export class EmergencyPlanReviewOverdueScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM emergency_response_plans WHERE status = 'APPROVED_ACTIVE'
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "emergency-plan-review-overdue-scan gagal untuk satu tenant", {
          module: "emergency-response",
          action: "emergency-plan-review-overdue-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const { overduePlans, hseManagerIds } = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const plans = await tx.emergencyResponsePlan.findMany({
          where: { status: "APPROVED_ACTIVE", deletedAt: null },
          select: { id: true, planNumber: true, planTitle: true, nextReviewDueDate: true },
        });
        if (plans.length === 0) return { overduePlans: [] as typeof plans, hseManagerIds: [] as string[] };

        const candidates: PlanReviewOverdueCandidate[] = plans.map((p) => ({ planId: p.id, nextReviewDueDate: p.nextReviewDueDate }));
        const overdueIds = new Set(findPlansWithOverdueReview(candidates, now).map((c) => c.planId));
        const overduePlans = plans.filter((p) => overdueIds.has(p.id));
        if (overduePlans.length === 0) return { overduePlans: [] as typeof plans, hseManagerIds: [] as string[] };

        const hseManagers = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
          select: { id: true },
        });

        this.logger.event("info", "emergency-plan-review-overdue-scan: transisi diproses", {
          module: "emergency-response",
          action: "emergency-plan-review-overdue-scan.processed",
          tenant_id: tenantId,
          overdue_count: overduePlans.length,
        });

        return { overduePlans, hseManagerIds: hseManagers.map((m) => m.id) };
      }),
    );

    for (const plan of overduePlans) {
      for (const recipientUserId of hseManagerIds) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.notificationService.enqueue({
            eventType: "EMERGENCY_PLAN_REVIEW_OVERDUE",
            entityType: "EMERGENCY_RESPONSE_PLAN",
            entityId: plan.id,
            recipientUserId,
            priority: "HIGH",
            eventCategory: "EMERGENCY_RESPONSE",
            variables: { planTitle: plan.planTitle, planNumber: plan.planNumber ?? plan.id },
          }),
        );
      }
    }
  }
}
