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
exports.IncidentStatisticsCacheService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const incident_context_1 = require("./incident-context");
const incident_statistics_formulas_1 = require("./incident-statistics-formulas");
const incident_statistics_tally_1 = require("./incident-statistics-tally");
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
let IncidentStatisticsCacheService = class IncidentStatisticsCacheService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recalculate(input) {
        const updatedBy = (0, incident_context_1.requireActorUserId)();
        const tenantId = (0, incident_context_1.requireTenantId)();
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
            const counts = (0, incident_statistics_tally_1.tallyIncidentCounts)(reports);
            const rateInput = { ...counts, totalManhoursWorked: input.totalManhoursWorked, rateBaseHoursUsed: input.rateBaseHoursUsed };
            const computed = {
                ...counts,
                totalManhoursWorked: input.totalManhoursWorked,
                rateBaseHoursUsed: input.rateBaseHoursUsed,
                ltifr: (0, incident_statistics_formulas_1.calculateLtifr)(rateInput),
                trir: (0, incident_statistics_formulas_1.calculateTrir)(rateInput),
                severityRate: (0, incident_statistics_formulas_1.calculateSeverityRate)(rateInput),
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
    async listByScope(siteId) {
        return this.prisma.withRls((tx) => tx.incidentStatisticsCache.findMany({ where: { siteId }, orderBy: { periodStartDate: "desc" } }));
    }
};
exports.IncidentStatisticsCacheService = IncidentStatisticsCacheService;
exports.IncidentStatisticsCacheService = IncidentStatisticsCacheService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IncidentStatisticsCacheService);
//# sourceMappingURL=incident-statistics-cache.service.js.map