import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../../platform/notification/notification.service";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../../platform/tenancy/tenant-context";
import { findOverdueRiskRegisterReviews, RiskRegisterReviewCandidate } from "./risk-register-review-scan";
import { findOverdueRiskTreatmentPlans, RiskTreatmentOverdueCandidate } from "./risk-treatment-overdue-scan";

// TDD §13.1/§9 pola job cross-tenant. PRD §8 baris 3 (risk_register
// overdue, BR-05) + baris 4 (risk_treatment_plans overdue) DIGABUNG SATU
// job — dua tabel BERBEDA (bukan pola "1 tabel 2 concern" spt DMS/
// Compliance), tapi SAMA-SAMA "tinjauan berkala risiko" modul ini,
// dijadwalkan bersama drpd bikin queue terpisah utk masing-masing.
@Injectable()
export class RiskRegisterReviewScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM (
        SELECT tenant_id FROM risk_register WHERE status != 'CLOSED' AND next_review_date IS NOT NULL
        UNION
        SELECT tenant_id FROM risk_treatment_plans WHERE status IN ('PLANNED', 'IN_PROGRESS')
      ) t
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "risk-register-review-scan gagal untuk satu tenant", {
          module: "risk-management",
          action: "risk-register-review-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const notifications = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const results: Array<{ eventType: string; entityType: string; entityId: string; recipientUserId: string; variables: Record<string, string> }> = [];

        // BR-05 — risk_register overdue.
        const risks = await tx.riskRegister.findMany({ where: { status: { not: "CLOSED" }, nextReviewDate: { not: null }, deletedAt: null } });
        if (risks.length > 0) {
          const riskCandidates: RiskRegisterReviewCandidate[] = risks.map((r) => ({
            riskRegisterId: r.id,
            nextReviewDate: r.nextReviewDate,
            status: r.status,
            overdueNotifiedAt: r.overdueNotifiedAt,
          }));
          const overdueRiskIds = findOverdueRiskRegisterReviews(riskCandidates, now).map((c) => c.riskRegisterId);
          if (overdueRiskIds.length > 0) {
            await tx.riskRegister.updateMany({ where: { id: { in: overdueRiskIds } }, data: { overdueNotifiedAt: now } });
            const hseManagers = await tx.user.findMany({
              where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
              select: { id: true },
            });
            const byId = new Map(risks.map((r) => [r.id, r]));
            for (const riskId of overdueRiskIds) {
              const risk = byId.get(riskId)!;
              const recipients = new Set([risk.riskOwnerUserId, ...hseManagers.map((m) => m.id)]);
              for (const recipientUserId of recipients) {
                results.push({
                  eventType: "RISK_REGISTER_REVIEW_OVERDUE",
                  entityType: "RISK_REGISTER",
                  entityId: riskId,
                  recipientUserId,
                  variables: { riskTitle: risk.riskTitle },
                });
              }
            }
          }
        }

        // PRD §8 baris 4 — risk_treatment_plans overdue.
        const plans = await tx.riskTreatmentPlan.findMany({ where: { status: { in: ["PLANNED", "IN_PROGRESS"] }, deletedAt: null } });
        if (plans.length > 0) {
          const planCandidates: RiskTreatmentOverdueCandidate[] = plans.map((p) => ({
            riskTreatmentId: p.id,
            targetDate: p.targetDate,
            status: p.status,
            overdueNotifiedAt: p.overdueNotifiedAt,
          }));
          const overduePlanIds = findOverdueRiskTreatmentPlans(planCandidates, now).map((c) => c.riskTreatmentId);
          if (overduePlanIds.length > 0) {
            await tx.riskTreatmentPlan.updateMany({ where: { id: { in: overduePlanIds } }, data: { overdueNotifiedAt: now } });
            const byId = new Map(plans.map((p) => [p.id, p]));
            const responsibleUsers = await tx.user.findMany({
              where: { id: { in: [...new Set(plans.map((p) => p.responsibleUserId))] } },
              select: { id: true, reportingToUserId: true },
            });
            const reportingToById = new Map(responsibleUsers.map((u) => [u.id, u.reportingToUserId]));
            for (const planId of overduePlanIds) {
              const plan = byId.get(planId)!;
              const recipients = new Set([plan.responsibleUserId]);
              const superior = reportingToById.get(plan.responsibleUserId);
              if (superior) recipients.add(superior);
              for (const recipientUserId of recipients) {
                results.push({
                  eventType: "RISK_TREATMENT_PLAN_OVERDUE",
                  entityType: "RISK_TREATMENT_PLAN",
                  entityId: planId,
                  recipientUserId,
                  variables: { treatmentDescription: plan.treatmentDescription },
                });
              }
            }
          }
        }

        this.logger.event("info", "risk-register-review-scan: overdue diproses", {
          module: "risk-management",
          action: "risk-register-review-scan.processed",
          tenant_id: tenantId,
          notification_count: results.length,
        });

        return results;
      }),
    );

    for (const n of notifications) {
      await tenantContextStorage.run({ tenantId }, () =>
        this.notificationService.enqueue({
          eventType: n.eventType,
          entityType: n.entityType,
          entityId: n.entityId,
          recipientUserId: n.recipientUserId,
          priority: "HIGH",
          eventCategory: "RISK",
          variables: n.variables,
        }),
      );
    }
  }
}
