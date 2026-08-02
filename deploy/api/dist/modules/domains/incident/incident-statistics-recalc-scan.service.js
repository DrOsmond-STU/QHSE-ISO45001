"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentStatisticsRecalcScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const incident_statistics_formulas_1 = require("./incident-statistics-formulas");
const incident_statistics_tally_1 = require("./incident-statistics-tally");
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
let IncidentStatisticsRecalcScanService = class IncidentStatisticsRecalcScanService {
    prisma;
    logger;
    adminPrisma;
    constructor(prisma, logger) {
        this.prisma = prisma;
        this.logger = logger;
        this.adminPrisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    }
    async onModuleDestroy() {
        await this.adminPrisma.$disconnect();
    }
    async scan(now = new Date()) {
        const rows = await this.adminPrisma.$queryRaw `
      SELECT DISTINCT tenant_id FROM incident_statistics_cache WHERE deleted_at IS NULL
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "incident-statistics-recalc-scan gagal untuk satu tenant", {
                    module: "incident",
                    action: "incident-statistics-recalc-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
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
                const counts = (0, incident_statistics_tally_1.tallyIncidentCounts)(reports);
                const rateInput = {
                    ...counts,
                    totalManhoursWorked: Number(cache.totalManhoursWorked),
                    rateBaseHoursUsed: Number(cache.rateBaseHoursUsed),
                };
                await tx.incidentStatisticsCache.update({
                    where: { id: cache.id },
                    data: {
                        ...counts,
                        ltifr: (0, incident_statistics_formulas_1.calculateLtifr)(rateInput),
                        trir: (0, incident_statistics_formulas_1.calculateTrir)(rateInput),
                        severityRate: (0, incident_statistics_formulas_1.calculateSeverityRate)(rateInput),
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
        }));
    }
};
exports.IncidentStatisticsRecalcScanService = IncidentStatisticsRecalcScanService;
exports.IncidentStatisticsRecalcScanService = IncidentStatisticsRecalcScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_logger_service_1.AppLoggerService])
], IncidentStatisticsRecalcScanService);
//# sourceMappingURL=incident-statistics-recalc-scan.service.js.map