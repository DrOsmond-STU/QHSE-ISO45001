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
exports.ReminderScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const reminder_scan_1 = require("./reminder-scan");
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
let ReminderScanService = class ReminderScanService {
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
      SELECT DISTINCT tenant_id FROM sites
      WHERE site_type = 'PROJECT' AND status = 'ACTIVE' AND auto_archive_on_end_date = true AND end_date IS NOT NULL
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
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
    async scanForTenant(tenantId, now) {
        await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const activeProjectSites = await tx.site.findMany({
                where: { siteType: "PROJECT", status: "ACTIVE", autoArchiveOnEndDate: true, endDate: { not: null } },
                select: { id: true, endDate: true },
            });
            const candidates = activeProjectSites
                .filter((s) => s.endDate !== null)
                .map((s) => ({ siteId: s.id, endDate: s.endDate }));
            const overdueSiteIds = (0, reminder_scan_1.findOverdueSites)(candidates, now).map((c) => c.siteId);
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
        }));
    }
};
exports.ReminderScanService = ReminderScanService;
exports.ReminderScanService = ReminderScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_logger_service_1.AppLoggerService])
], ReminderScanService);
