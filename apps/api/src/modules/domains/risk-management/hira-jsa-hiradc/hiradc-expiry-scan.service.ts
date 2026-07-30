import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../../platform/observability/app-logger.service";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../../platform/tenancy/tenant-context";
import { findExpiredHiradcRecords, HiradcExpiryCandidate } from "./hiradc-expiry-scan";

// TDD §13.1/§9 pola job cross-tenant (sama persis LicenseExpiryScanService,
// 2.2). BR-04 murni transisi status — PRD §8 TIDAK py baris notifikasi
// utk HIRADC expired sama sekali (beda dari licenses_permits H-90/30/7/
// expired 2.2 yang eksplisit diminta) — job ini TIDAK enqueue notifikasi
// apa pun, murni housekeeping status (HIRADC lazimnya berumur 1 shift,
// bukan dokumen legal jangka panjang spt izin).
@Injectable()
export class HiradcExpiryScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM hiradc_records WHERE status IN ('DRAFT', 'VERIFIED', 'APPROVED') AND valid_until IS NOT NULL
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "hiradc-expiry-scan gagal untuk satu tenant", {
          module: "risk-management",
          action: "hiradc-expiry-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const records = await tx.hiradcRecord.findMany({
          where: { status: { in: ["DRAFT", "VERIFIED", "APPROVED"] }, validUntil: { not: null }, deletedAt: null },
        });
        if (records.length === 0) return;

        const candidates: HiradcExpiryCandidate[] = records.map((r) => ({ hiradcId: r.id, validUntil: r.validUntil, status: r.status }));
        const expiredIds = findExpiredHiradcRecords(candidates, now).map((c) => c.hiradcId);
        if (expiredIds.length === 0) return;

        await tx.hiradcRecord.updateMany({ where: { id: { in: expiredIds } }, data: { status: "EXPIRED" } });

        this.logger.event("info", "hiradc-expiry-scan: transisi diproses", {
          module: "risk-management",
          action: "hiradc-expiry-scan.processed",
          tenant_id: tenantId,
          expired_count: expiredIds.length,
        });
      }),
    );
  }
}
