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
exports.UsageCounterScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../../platform/observability/app-logger.service");
const tenant_context_1 = require("../../../../platform/tenancy/tenant-context");
const usage_quota_1 = require("./usage-quota");
const usage_counter_service_1 = require("./usage-counter.service");
// TDD §13.1/§9 — pola job cross-tenant PERSIS reminder-scan (1.1)/
// delegation-scan (1.4). BR-02 (PRD Modul 31 §6): snapshot harian
// ACTIVE_USERS/ACTIVE_SITES, deteksi pelanggaran kuota TIDAK memblokir
// operasional — cuma LOG (notifikasi ke Tenant Admin/Super Admin Platform
// SENGAJA belum di-wire, gap TDD §26, pola konsisten seluruh task 1.1-1.4).
//
// Temuan operasional: bootstrap query AWALNYA `SELECT tenant_id FROM
// tenants` (SEMUA tenant tanpa filter) — timeout (>20s) begitu dijalankan
// bareng full test suite, krn DB dev lokal bersama sudah mengakumulasi
// ribuan baris tenants dari fixture Jest lintas SEMUA task 0.1-1.5 yang
// tidak pernah dibersihkan (pola sama gap TDD §26 poin 22, kasus 1,579
// baris users task 1.1). Diperbaiki mengikuti pola reminder-scan/
// delegation-scan/workflow-sla-scan yang SUDAH benar sejak awal: filter DI
// query bootstrap itu sendiri (tenant_subscriptions berstatus
// TRIAL/ACTIVE saja — jauh lebih sedikit drpd SELURUH tenants), bukan
// iterasi semua lalu filter di dalam loop. Sekalian JOIN subscription_plans
// di query yang sama supaya tidak perlu query kuota terpisah per tenant.
let UsageCounterScanService = class UsageCounterScanService {
    usageCounterService;
    logger;
    adminPrisma;
    constructor(usageCounterService, logger) {
        this.usageCounterService = usageCounterService;
        this.logger = logger;
        this.adminPrisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    }
    async onModuleDestroy() {
        await this.adminPrisma.$disconnect();
    }
    async scan() {
        const rows = await this.adminPrisma.$queryRaw `
      SELECT DISTINCT ON (ts.tenant_id) ts.tenant_id, sp.max_users, sp.max_sites
      FROM tenant_subscriptions ts
      JOIN subscription_plans sp ON sp.subscription_plan_id = ts.subscription_plan_id
      WHERE ts.status IN ('TRIAL', 'ACTIVE')
      ORDER BY ts.tenant_id, ts.created_at DESC
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, { maxUsers: row.max_users, maxSites: row.max_sites });
            }
            catch (err) {
                this.logger.event("error", "usage-counter-scan gagal untuk satu tenant", {
                    module: "system-administration",
                    action: "usage-counter-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, quota) {
        await tenant_context_1.tenantContextStorage.run({ tenantId }, async () => {
            const counters = await this.usageCounterService.snapshot(tenantId);
            for (const counter of counters) {
                const maxValue = counter.metricType === "ACTIVE_USERS" ? quota.maxUsers : quota.maxSites;
                const result = (0, usage_quota_1.checkQuota)({ metricType: counter.metricType, currentValue: counter.currentValue, maxValue });
                if (result.exceeded) {
                    this.logger.event("warn", "BR-02: pemakaian melebihi kuota plan (operasional TIDAK diblokir)", {
                        module: "system-administration",
                        action: "usage-counter-scan.quota-exceeded",
                        tenant_id: tenantId,
                        metric_type: result.metricType,
                        current_value: result.currentValue,
                        max_value: result.maxValue,
                    });
                }
            }
        });
    }
};
exports.UsageCounterScanService = UsageCounterScanService;
exports.UsageCounterScanService = UsageCounterScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [usage_counter_service_1.UsageCounterService,
        app_logger_service_1.AppLoggerService])
], UsageCounterScanService);
