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
exports.HiradcExpiryScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../../platform/observability/app-logger.service");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../../platform/tenancy/tenant-context");
const hiradc_expiry_scan_1 = require("./hiradc-expiry-scan");
// TDD §13.1/§9 pola job cross-tenant (sama persis LicenseExpiryScanService,
// 2.2). BR-04 murni transisi status — PRD §8 TIDAK py baris notifikasi
// utk HIRADC expired sama sekali (beda dari licenses_permits H-90/30/7/
// expired 2.2 yang eksplisit diminta) — job ini TIDAK enqueue notifikasi
// apa pun, murni housekeeping status (HIRADC lazimnya berumur 1 shift,
// bukan dokumen legal jangka panjang spt izin).
let HiradcExpiryScanService = class HiradcExpiryScanService {
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
      SELECT DISTINCT tenant_id FROM hiradc_records WHERE status IN ('DRAFT', 'VERIFIED', 'APPROVED') AND valid_until IS NOT NULL
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "hiradc-expiry-scan gagal untuk satu tenant", {
                    module: "risk-management",
                    action: "hiradc-expiry-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const records = await tx.hiradcRecord.findMany({
                where: { status: { in: ["DRAFT", "VERIFIED", "APPROVED"] }, validUntil: { not: null }, deletedAt: null },
            });
            if (records.length === 0)
                return;
            const candidates = records.map((r) => ({ hiradcId: r.id, validUntil: r.validUntil, status: r.status }));
            const expiredIds = (0, hiradc_expiry_scan_1.findExpiredHiradcRecords)(candidates, now).map((c) => c.hiradcId);
            if (expiredIds.length === 0)
                return;
            await tx.hiradcRecord.updateMany({ where: { id: { in: expiredIds } }, data: { status: "EXPIRED" } });
            this.logger.event("info", "hiradc-expiry-scan: transisi diproses", {
                module: "risk-management",
                action: "hiradc-expiry-scan.processed",
                tenant_id: tenantId,
                expired_count: expiredIds.length,
            });
        }));
    }
};
exports.HiradcExpiryScanService = HiradcExpiryScanService;
exports.HiradcExpiryScanService = HiradcExpiryScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_logger_service_1.AppLoggerService])
], HiradcExpiryScanService);
//# sourceMappingURL=hiradc-expiry-scan.service.js.map