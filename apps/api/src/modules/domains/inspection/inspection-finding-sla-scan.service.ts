import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { findHighSeverityFindingsNeedingEscalation, FindingSlaCandidate } from "./inspection-finding-sla-scan";

/**
 * TDD §13.1/§9 pola job cross-tenant. BR-04 — "temuan severity=HIGH wajib
 * memiliki action_tracking_id terisi dalam SLA 24 jam sejak identified_at,
 * ATAU sistem mengeskalasi notifikasi ke HSE Manager." BEDA dari 2 scan
 * lain modul ini — TIDAK ADA transisi status di sini (inspection_findings.status
 * TETAP OPEN/apa pun adanya), BR-04 murni eskalasi NOTIFIKASI. Konsekuensi:
 * TIDAK ADA kolom idempotency tracking (pola sama gap H-30-menit gas
 * retest Work Permit 3.4) — finding yang SAMA akan terus dinotifikasi
 * ULANG SETIAP SCAN sampai action_tracking_id terisi atau status=CLOSED,
 * dibaca sbg "nag harian" yang genuinely masuk akal utk severity HIGH yang
 * belum ditindaklanjuti (bukan bug, tapi beda dari precedent scan lain,
 * gap didokumentasikan TDD §26).
 */
@Injectable()
export class InspectionFindingSlaScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM inspection_findings
      WHERE severity = 'HIGH' AND action_tracking_id IS NULL AND status != 'CLOSED'
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "inspection-finding-sla-scan gagal untuk satu tenant", {
          module: "inspection",
          action: "inspection-finding-sla-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const { needingEscalationIds, hseManagerIds } = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const findings = await tx.inspectionFinding.findMany({
          where: { severity: "HIGH", actionTrackingId: null, status: { not: "CLOSED" }, deletedAt: null },
          select: { id: true, identifiedAt: true },
        });
        if (findings.length === 0) return { needingEscalationIds: [] as string[], hseManagerIds: [] as string[] };

        const candidates: FindingSlaCandidate[] = findings.map((f) => ({ findingId: f.id, identifiedAt: f.identifiedAt }));
        const needingEscalationIds = findHighSeverityFindingsNeedingEscalation(candidates, now).map((c) => c.findingId);
        if (needingEscalationIds.length === 0) return { needingEscalationIds: [] as string[], hseManagerIds: [] as string[] };

        const hseManagers = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
          select: { id: true },
        });

        this.logger.event("info", "inspection-finding-sla-scan: eskalasi diproses", {
          module: "inspection",
          action: "inspection-finding-sla-scan.processed",
          tenant_id: tenantId,
          escalated_count: needingEscalationIds.length,
        });

        return { needingEscalationIds, hseManagerIds: hseManagers.map((m) => m.id) };
      }),
    );

    for (const findingId of needingEscalationIds) {
      const finding = await tenantContextStorage.run({ tenantId }, () =>
        this.prisma.withRls((tx) => tx.inspectionFinding.findUniqueOrThrow({ where: { id: findingId }, select: { title: true } })),
      );
      for (const recipientUserId of hseManagerIds) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.notificationService.enqueue({
            eventType: "INSPECTION_FINDING_SLA_BREACH",
            entityType: "INSPECTION_FINDING",
            entityId: findingId,
            recipientUserId,
            priority: "HIGH",
            eventCategory: "INSPECTION",
            variables: { title: finding.title },
          }),
        );
      }
    }
  }
}
