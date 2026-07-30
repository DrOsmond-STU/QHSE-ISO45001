import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { findOverdueSites, OverdueSiteCandidate } from "./reminder-scan";

// TDD §13.1/§9 (pola job cross-tenant sama persis WorkflowSlaScanService
// 0.9 — "jadi rujukan utk job cross-tenant lain nanti"): bootstrap
// read-only via role admin (tenant_id mana saja yang punya kandidat),
// lalu SETIAP tenant diproses lewat tenantContextStorage + withRls()
// (RLS penuh, tidak ada query domain yang bypass RLS).
//
// KONSUMEN PERTAMA job reminder-scan generik (BR-06 Modul 01) — modul
// Phase 2+ (kalibrasi, permit, training, subscription) menambah query
// kandidatnya SENDIRI ke method scan() ini begitu tabelnya ada, bukan job
// terpisah (lihat reminder-scan.constants.ts).
@Injectable()
export class ReminderScanService implements OnModuleDestroy {
  private readonly adminPrisma: PrismaClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {
    this.adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.adminPrisma.$disconnect();
  }

  async scan(now: Date = new Date()): Promise<void> {
    const rows = await this.adminPrisma.$queryRaw<Array<{ tenant_id: string }>>`
      SELECT DISTINCT tenant_id FROM sites
      WHERE site_type = 'PROJECT' AND status = 'ACTIVE' AND auto_archive_on_end_date = true AND end_date IS NOT NULL
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        // Satu tenant error TIDAK boleh gagalkan scan tenant lain (TDD
        // §13.2 — job gagal permanen -> dead-letter + alert, bukan diam-diam
        // menghentikan seluruh batch).
        this.logger.event("error", "reminder-scan gagal untuk satu tenant", {
          module: "organization",
          action: "reminder-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const activeProjectSites = await tx.site.findMany({
          where: { siteType: "PROJECT", status: "ACTIVE", autoArchiveOnEndDate: true, endDate: { not: null } },
          select: { id: true, endDate: true },
        });

        const candidates: OverdueSiteCandidate[] = activeProjectSites
          .filter((s) => s.endDate !== null)
          .map((s) => ({ siteId: s.id, endDate: s.endDate as Date }));

        const overdueSiteIds = findOverdueSites(candidates, now).map((c) => c.siteId);
        if (overdueSiteIds.length === 0) {
          return;
        }

        await tx.site.updateMany({
          where: { id: { in: overdueSiteIds } },
          data: { status: "INACTIVE" },
        });

        this.logger.event("info", "site PROJECT lewat end_date -> INACTIVE (BR-06)", {
          module: "organization",
          action: "reminder-scan.sites-deactivated",
          tenant_id: tenantId,
          site_ids: overdueSiteIds,
        });
      }),
    );
  }
}
