import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
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
export declare class IncidentStatisticsRecalcScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
}
