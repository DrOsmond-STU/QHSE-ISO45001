import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { findExpiredWorkPermits, WorkPermitExpiryCandidate } from "./work-permit-expiry-scan";

// TDD §13.1/§9 pola job cross-tenant (sama persis HiradcExpiryScanService,
// 3.2). BR-07 (PRD §6) — "permit yang melewati batas waktu tanpa
// extension disetujui otomatis berstatus EXPIRED dan dieskalasi" — status
// menjadi guard idempotency ALAMI (permit EXPIRED keluar dari filter
// status IN ('ACTIVE','EXTENSION_REQUESTED') scan berikutnya), TIDAK
// butuh kolom tracking tambahan. E2E-1 acceptance criterion literal
// TASK_INSTRUCTION.md 3.4.
@Injectable()
export class WorkPermitExpiryScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM work_permits WHERE status IN ('ACTIVE', 'EXTENSION_REQUESTED')
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "work-permit-expiry-scan gagal untuk satu tenant", {
          module: "work-permit",
          action: "work-permit-expiry-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const { expiredIds, hseManagerIds } = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const permits = await tx.workPermit.findMany({
          where: { status: { in: ["ACTIVE", "EXTENSION_REQUESTED"] }, deletedAt: null },
          select: { id: true, plannedEndDatetime: true, status: true },
        });
        if (permits.length === 0) return { expiredIds: [] as string[], hseManagerIds: [] as string[] };

        const candidates: WorkPermitExpiryCandidate[] = permits.map((p) => ({
          workPermitId: p.id,
          plannedEndDatetime: p.plannedEndDatetime,
          status: p.status as "ACTIVE" | "EXTENSION_REQUESTED",
        }));
        const expiredIds = findExpiredWorkPermits(candidates, now).map((c) => c.workPermitId);
        if (expiredIds.length === 0) return { expiredIds: [] as string[], hseManagerIds: [] as string[] };

        await tx.workPermit.updateMany({ where: { id: { in: expiredIds } }, data: { status: "EXPIRED" } });

        const hseManagers = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
          select: { id: true },
        });

        this.logger.event("info", "work-permit-expiry-scan: transisi diproses", {
          module: "work-permit",
          action: "work-permit-expiry-scan.processed",
          tenant_id: tenantId,
          expired_count: expiredIds.length,
        });

        return { expiredIds, hseManagerIds: hseManagers.map((m) => m.id) };
      }),
    );

    // PRD §8 "Permit expired tanpa closure -> HSE Manager -> 'Permit
    // {permit_number} EXPIRED tanpa penutupan'".
    for (const workPermitId of expiredIds) {
      const permitNumber = await tenantContextStorage.run({ tenantId }, () =>
        this.prisma.withRls((tx) => tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId }, select: { permitNumber: true } })),
      );
      for (const recipientUserId of hseManagerIds) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.notificationService.enqueue({
            eventType: "WORK_PERMIT_EXPIRED",
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
