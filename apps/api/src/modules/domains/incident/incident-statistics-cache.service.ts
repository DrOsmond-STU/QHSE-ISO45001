import { Injectable } from "@nestjs/common";
import { IncidentStatisticsCache, IncidentStatisticsPeriodType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./incident-context";
import { calculateLtifr, calculateSeverityRate, calculateTrir } from "./incident-statistics-formulas";
import { tallyIncidentCounts } from "./incident-statistics-tally";

export interface RecalculateIncidentStatisticsInput {
  companyId?: string;
  branchId?: string;
  siteId?: string;
  periodType: IncidentStatisticsPeriodType;
  periodStartDate: Date;
  periodEndDate: Date;
  totalManhoursWorked: number;
  rateBaseHoursUsed: number;
}

/**
 * BR-06 (PRD Modul 07 §5/§6) — "dihitung ulang via scheduled job (default
 * harian), dapat dipicu manual oleh HSE Manager; TIDAK dihitung on-the-fly
 * di setiap page load." `total_manhours_worked` PRD sendiri "input manual/
 * integrasi HRIS" — TIDAK ADA sumber otomatis di codebase ini (integrasi
 * HRIS belum ada modul manapun) — recalculate() SELALU perlu totalManhoursWorked
 * disuplai eksplisit (pola "trigger manual HSE Manager"); scan job harian
 * (IncidentStatisticsRecalcScanService) HANYA me-refresh baris yang SUDAH
 * PERNAH dihitung (pakai ULANG totalManhoursWorked/rateBaseHoursUsed
 * tersimpan baris itu) — gap didokumentasikan TDD §26.
 */
@Injectable()
export class IncidentStatisticsCacheService {
  constructor(private readonly prisma: PrismaService) {}

  async recalculate(input: RecalculateIncidentStatisticsInput): Promise<IncidentStatisticsCache> {
    const updatedBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls(async (tx) => {
      const reports = await tx.incidentReport.findMany({
        where: {
          companyId: input.companyId,
          branchId: input.branchId,
          siteId: input.siteId,
          incidentDatetime: { gte: input.periodStartDate, lte: input.periodEndDate },
          deletedAt: null,
        },
        select: { classification: true, daysLost: true },
      });
      const counts = tallyIncidentCounts(reports);
      const rateInput = { ...counts, totalManhoursWorked: input.totalManhoursWorked, rateBaseHoursUsed: input.rateBaseHoursUsed };
      const computed = {
        ...counts,
        totalManhoursWorked: input.totalManhoursWorked,
        rateBaseHoursUsed: input.rateBaseHoursUsed,
        ltifr: calculateLtifr(rateInput),
        trir: calculateTrir(rateInput),
        severityRate: calculateSeverityRate(rateInput),
        calculatedAt: new Date(),
        updatedBy,
      };

      const existing = await tx.incidentStatisticsCache.findFirst({
        where: {
          tenantId,
          companyId: input.companyId ?? null,
          branchId: input.branchId ?? null,
          siteId: input.siteId ?? null,
          periodType: input.periodType,
          periodStartDate: input.periodStartDate,
        },
      });
      if (existing) {
        return tx.incidentStatisticsCache.update({ where: { id: existing.id }, data: computed });
      }
      return tx.incidentStatisticsCache.create({
        data: {
          tenantId,
          companyId: input.companyId,
          branchId: input.branchId,
          siteId: input.siteId,
          periodType: input.periodType,
          periodStartDate: input.periodStartDate,
          periodEndDate: input.periodEndDate,
          ...computed,
          createdBy: updatedBy,
        },
      });
    });
  }

  async listByScope(siteId?: string): Promise<IncidentStatisticsCache[]> {
    return this.prisma.withRls((tx) => tx.incidentStatisticsCache.findMany({ where: { siteId }, orderBy: { periodStartDate: "desc" } }));
  }
}
