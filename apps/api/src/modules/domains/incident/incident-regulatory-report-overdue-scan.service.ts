import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { findOverdueRegulatoryReports, RegulatoryReportOverdueCandidate } from "./incident-regulatory-report-overdue-scan";

// TDD §13.1/§9 pola job cross-tenant (sama persis WorkPermitExpiryScanService,
// 3.4). BR-09 (PRD §6, tidak langsung — status OVERDUE adalah prasyarat gate
// CLOSED) — status menjadi guard idempotency alami (baris OVERDUE keluar
// dari filter status='PENDING' scan berikutnya sampai disubmit()).
@Injectable()
export class IncidentRegulatoryReportOverdueScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM incident_regulatory_reports WHERE status = 'PENDING'
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "incident-regulatory-report-overdue-scan gagal untuk satu tenant", {
          module: "incident",
          action: "incident-regulatory-report-overdue-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const { overdueIds, hseManagerIds } = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const reports = await tx.incidentRegulatoryReport.findMany({
          where: { status: "PENDING", deletedAt: null },
          select: { id: true, requiredByDate: true },
        });
        if (reports.length === 0) return { overdueIds: [] as string[], hseManagerIds: [] as string[] };

        const candidates: RegulatoryReportOverdueCandidate[] = reports.map((r) => ({
          incidentRegulatoryReportId: r.id,
          requiredByDate: r.requiredByDate,
        }));
        const overdueIds = findOverdueRegulatoryReports(candidates, now).map((c) => c.incidentRegulatoryReportId);
        if (overdueIds.length === 0) return { overdueIds: [] as string[], hseManagerIds: [] as string[] };

        await tx.incidentRegulatoryReport.updateMany({ where: { id: { in: overdueIds } }, data: { status: "OVERDUE" } });

        const hseManagers = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
          select: { id: true },
        });

        this.logger.event("info", "incident-regulatory-report-overdue-scan: transisi diproses", {
          module: "incident",
          action: "incident-regulatory-report-overdue-scan.processed",
          tenant_id: tenantId,
          overdue_count: overdueIds.length,
        });

        return { overdueIds, hseManagerIds: hseManagers.map((m) => m.id) };
      }),
    );

    for (const incidentRegulatoryReportId of overdueIds) {
      const report = await tenantContextStorage.run({ tenantId }, () =>
        this.prisma.withRls((tx) =>
          tx.incidentRegulatoryReport.findUniqueOrThrow({
            where: { id: incidentRegulatoryReportId },
            select: { incidentReport: { select: { incidentNumber: true } } },
          }),
        ),
      );
      for (const recipientUserId of hseManagerIds) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.notificationService.enqueue({
            eventType: "INCIDENT_REGULATORY_REPORT_OVERDUE",
            entityType: "INCIDENT_REGULATORY_REPORT",
            entityId: incidentRegulatoryReportId,
            recipientUserId,
            priority: "HIGH",
            eventCategory: "INCIDENT",
            variables: { incidentNumber: report.incidentReport.incidentNumber },
          }),
        );
      }
    }
  }
}
