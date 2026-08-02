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
exports.EnvironmentalPermitService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const environmental_context_1 = require("./environmental-context");
/**
 * Task 5.2 (Modul 12 §5, BR-05 — 1:1 ekstensi `licenses_permits` Modul 04).
 * BELUM ada controller HTTP. Validasi `licensePermitId` via QUERY PRISMA
 * LANGSUNG ke `licenses_permits` (pola sama `assertSourceValidIfKnownContract()`
 * CAPA 4.2/5.1) — TIDAK mengimpor RegulatoryComplianceModule (arah
 * dependency: Prisma schema shared resource, NestJS module boundary bukan
 * soal per-tabel ownership, lihat memory project-qhse-dev-conventions.md
 * "Module layering rule").
 */
let EnvironmentalPermitService = class EnvironmentalPermitService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const createdBy = (0, environmental_context_1.requireActorUserId)();
        const tenantId = (0, environmental_context_1.requireTenantId)();
        // BR-05 — pastikan licenses_permits genuinely ada (RLS-scoped, jadi
        // otomatis gagal kalau licensePermitId milik tenant lain).
        await this.prisma.withRls((tx) => tx.licensePermit.findUniqueOrThrow({ where: { id: input.licensePermitId } }));
        return this.prisma.withRls((tx) => tx.environmentalPermit.create({
            data: {
                tenantId,
                licensePermitId: input.licensePermitId,
                permitMedia: input.permitMedia,
                requiredMonitoringParameters: input.requiredMonitoringParameters,
                requiredMonitoringFrequency: input.requiredMonitoringFrequency,
                reportingObligationTo: input.reportingObligationTo,
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async recordReportSubmitted(environmentalPermitId) {
        const updatedBy = (0, environmental_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.environmentalPermit.update({ where: { id: environmentalPermitId }, data: { lastReportSubmittedDate: new Date(), updatedBy } }));
    }
    async getById(environmentalPermitId) {
        return this.prisma.withRls((tx) => tx.environmentalPermit.findUniqueOrThrow({ where: { id: environmentalPermitId } }));
    }
    async getByLicensePermitId(licensePermitId) {
        return this.prisma.withRls((tx) => tx.environmentalPermit.findUnique({ where: { licensePermitId } }));
    }
};
exports.EnvironmentalPermitService = EnvironmentalPermitService;
exports.EnvironmentalPermitService = EnvironmentalPermitService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EnvironmentalPermitService);
//# sourceMappingURL=environmental-permit.service.js.map