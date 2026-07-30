import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { findPermitsOverdueForGasRetest, GasRetestScanCandidate } from "./work-permit-gas-retest-scan";
import { validateWorkPermitStatusTransition } from "./work-permit-lifecycle";

// TDD §13.1/§9 pola job cross-tenant. BR-05 (PRD §6) — "jika [retest]
// terlewati, sistem otomatis mengubah status menjadi SUSPENDED dan
// mengeskalasi notifikasi ke HSE." Status menjadi guard idempotency ALAMI
// (permit SUSPENDED keluar dari filter status='ACTIVE' scan berikutnya,
// sampai WorkPermitService.resumeFromSuspension() mengembalikannya
// ACTIVE dgn retest_due_at baru), TIDAK butuh kolom tracking tambahan.
// PRD §8 baris "Gas retest jatuh tempo dalam 30 menit" (reminder SEBELUM
// overdue, BUKAN transisi status) SENGAJA TIDAK diimplementasikan job ini
// — butuh kolom idempotency tracking terpisah yang belum ada di skema
// literal Modul 06 §5, gap TDD §26 (pola sama keputusan 3.2 mendeprioritaskan
// notifikasi non-BR).
@Injectable()
export class GasRetestDueScanService implements OnModuleDestroy {
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
      SELECT DISTINCT wp.tenant_id
      FROM work_permits wp
      JOIN work_permit_types wpt ON wpt.work_permit_type_id = wp.work_permit_type_id
      WHERE wp.status = 'ACTIVE' AND wpt.gas_retest_interval_hours IS NOT NULL
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "gas-retest-due-scan gagal untuk satu tenant", {
          module: "work-permit",
          action: "gas-retest-due-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const { suspendedIds, hseManagerIds } = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const permits = await tx.workPermit.findMany({
          where: { status: "ACTIVE", deletedAt: null, workPermitType: { gasRetestIntervalHours: { not: null } } },
          select: { id: true },
        });
        if (permits.length === 0) return { suspendedIds: [] as string[], hseManagerIds: [] as string[] };

        const candidates: GasRetestScanCandidate[] = [];
        for (const permit of permits) {
          const latestTest = await tx.gasTestResult.findFirst({
            where: { workPermitId: permit.id },
            orderBy: { testDatetime: "desc" },
            select: { retestDueAt: true },
          });
          candidates.push({ workPermitId: permit.id, latestRetestDueAt: latestTest?.retestDueAt ?? null });
        }

        const suspendedIds = findPermitsOverdueForGasRetest(candidates, now).map((c) => c.workPermitId);
        if (suspendedIds.length === 0) return { suspendedIds: [] as string[], hseManagerIds: [] as string[] };

        for (const workPermitId of suspendedIds) {
          const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId } });
          validateWorkPermitStatusTransition(permit.status, "SUSPENDED");
        }
        await tx.workPermit.updateMany({ where: { id: { in: suspendedIds } }, data: { status: "SUSPENDED" } });

        const hseManagers = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
          select: { id: true },
        });

        this.logger.event("info", "gas-retest-due-scan: transisi diproses", {
          module: "work-permit",
          action: "gas-retest-due-scan.processed",
          tenant_id: tenantId,
          suspended_count: suspendedIds.length,
        });

        return { suspendedIds, hseManagerIds: hseManagers.map((m) => m.id) };
      }),
    );

    // PRD §8 "Gas retest terlewat -> HSE Manager -> 'Permit {permit_number}
    // otomatis SUSPENDED — retest gas terlewat'".
    for (const workPermitId of suspendedIds) {
      const permitNumber = await tenantContextStorage.run({ tenantId }, () =>
        this.prisma.withRls((tx) => tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId }, select: { permitNumber: true } })),
      );
      for (const recipientUserId of hseManagerIds) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.notificationService.enqueue({
            eventType: "WORK_PERMIT_GAS_RETEST_OVERDUE",
            entityType: "WORK_PERMIT",
            entityId: workPermitId,
            recipientUserId,
            priority: "HIGH",
            eventCategory: "WORK_PERMIT",
            variables: { permitNumber: permitNumber.permitNumber },
          }),
        );
      }
    }
  }
}
