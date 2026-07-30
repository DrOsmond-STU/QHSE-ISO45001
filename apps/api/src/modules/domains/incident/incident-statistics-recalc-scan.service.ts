import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { calculateLtifr, calculateSeverityRate, calculateTrir } from "./incident-statistics-formulas";
import { tallyIncidentCounts } from "./incident-statistics-tally";

/**
 * BR-06 (PRD Modul 07 §6) "dihitung ulang via scheduled job (default
 * harian)" — HANYA me-refresh baris incident_statistics_cache yang SUDAH
 * PERNAH dihitung minimal sekali (lewat IncidentStatisticsCacheService.recalculate()
 * manual, yang menyuplai total_manhours_worked pertama kali — TIDAK ADA
 * sumber manhours otomatis, lihat banner comment service tsb), pakai ULANG
 * total_manhours_worked/rate_base_hours_used TERSIMPAN baris itu — job ini
 * TIDAK PERNAH membuat baris baru, murni menyegarkan count+rate kalau
 * incident_reports periode ybs berubah (insiden baru/reklasifikasi BR-02)
 * sejak kalkulasi terakhir.
 */
@Injectable()
export class IncidentStatisticsRecalcScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM incident_statistics_cache WHERE deleted_at IS NULL
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "incident-statistics-recalc-scan gagal untuk satu tenant", {
          module: "incident",
          action: "incident-statistics-recalc-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const caches = await tx.incidentStatisticsCache.findMany({ where: { deletedAt: null } });

        for (const cache of caches) {
          const reports = await tx.incidentReport.findMany({
            where: {
              companyId: cache.companyId ?? undefined,
              branchId: cache.branchId ?? undefined,
              siteId: cache.siteId ?? undefined,
              incidentDatetime: { gte: cache.periodStartDate, lte: cache.periodEndDate },
              deletedAt: null,
            },
            select: { classification: true, daysLost: true },
          });
          const counts = tallyIncidentCounts(reports);
          const rateInput = {
            ...counts,
            totalManhoursWorked: Number(cache.totalManhoursWorked),
            rateBaseHoursUsed: Number(cache.rateBaseHoursUsed),
          };
          await tx.incidentStatisticsCache.update({
            where: { id: cache.id },
            data: {
              ...counts,
              ltifr: calculateLtifr(rateInput),
              trir: calculateTrir(rateInput),
              severityRate: calculateSeverityRate(rateInput),
              calculatedAt: now,
            },
          });
        }

        this.logger.event("info", "incident-statistics-recalc-scan: diproses", {
          module: "incident",
          action: "incident-statistics-recalc-scan.processed",
          tenant_id: tenantId,
          cache_count: caches.length,
        });
      }),
    );
  }
}
