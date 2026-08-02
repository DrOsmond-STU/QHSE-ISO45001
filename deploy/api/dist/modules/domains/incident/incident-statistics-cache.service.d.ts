import { IncidentStatisticsCache, IncidentStatisticsPeriodType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
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
export declare class IncidentStatisticsCacheService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    recalculate(input: RecalculateIncidentStatisticsInput): Promise<IncidentStatisticsCache>;
    listByScope(siteId?: string): Promise<IncidentStatisticsCache[]>;
}
