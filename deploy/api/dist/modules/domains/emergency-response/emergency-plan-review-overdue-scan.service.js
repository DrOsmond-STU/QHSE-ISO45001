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
exports.EmergencyPlanReviewOverdueScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const emergency_plan_review_overdue_scan_1 = require("./emergency-plan-review-overdue-scan");
/**
 * TDD §13.1/§9 pola job cross-tenant (sama persis scan job modul lain).
 * BR-01 — "status ditandai terlambat (flag dashboard) ... memicu
 * notifikasi eskalasi ke HSE Manager." TIDAK ADA transisi status di sini —
 * EmergencyPlanStatus TIDAK punya nilai enum "OVERDUE_REVIEW" apa pun
 * (skema §5 literal), jadi "flag dashboard" murni ditinjau LIVE dari
 * next_review_due_date (bukan kolom status tersimpan) — scan job ini
 * SEPENUHNYA notifikasi, pola PERSIS InspectionFindingSlaScanService (3.6)
 * "daily nag": plan yang SAMA akan terus dinotifikasi ULANG SETIAP HARI
 * sampai direview ulang (nextReviewDueDate bergeser) atau di-supersede/
 * archive — TIDAK ADA kolom idempotency, gap TDD §26.
 */
let EmergencyPlanReviewOverdueScanService = class EmergencyPlanReviewOverdueScanService {
    prisma;
    notificationService;
    logger;
    adminPrisma;
    constructor(prisma, notificationService, logger) {
        this.prisma = prisma;
        this.notificationService = notificationService;
        this.logger = logger;
        this.adminPrisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    }
    async onModuleDestroy() {
        await this.adminPrisma.$disconnect();
    }
    async scan(now = new Date()) {
        const rows = await this.adminPrisma.$queryRaw `
      SELECT DISTINCT tenant_id FROM emergency_response_plans WHERE status = 'APPROVED_ACTIVE'
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "emergency-plan-review-overdue-scan gagal untuk satu tenant", {
                    module: "emergency-response",
                    action: "emergency-plan-review-overdue-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const { overduePlans, hseManagerIds } = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const plans = await tx.emergencyResponsePlan.findMany({
                where: { status: "APPROVED_ACTIVE", deletedAt: null },
                select: { id: true, planNumber: true, planTitle: true, nextReviewDueDate: true },
            });
            if (plans.length === 0)
                return { overduePlans: [], hseManagerIds: [] };
            const candidates = plans.map((p) => ({ planId: p.id, nextReviewDueDate: p.nextReviewDueDate }));
            const overdueIds = new Set((0, emergency_plan_review_overdue_scan_1.findPlansWithOverdueReview)(candidates, now).map((c) => c.planId));
            const overduePlans = plans.filter((p) => overdueIds.has(p.id));
            if (overduePlans.length === 0)
                return { overduePlans: [], hseManagerIds: [] };
            const hseManagers = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
                select: { id: true },
            });
            this.logger.event("info", "emergency-plan-review-overdue-scan: transisi diproses", {
                module: "emergency-response",
                action: "emergency-plan-review-overdue-scan.processed",
                tenant_id: tenantId,
                overdue_count: overduePlans.length,
            });
            return { overduePlans, hseManagerIds: hseManagers.map((m) => m.id) };
        }));
        for (const plan of overduePlans) {
            for (const recipientUserId of hseManagerIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: "EMERGENCY_PLAN_REVIEW_OVERDUE",
                    entityType: "EMERGENCY_RESPONSE_PLAN",
                    entityId: plan.id,
                    recipientUserId,
                    priority: "HIGH",
                    eventCategory: "EMERGENCY_RESPONSE",
                    variables: { planTitle: plan.planTitle, planNumber: plan.planNumber ?? plan.id },
                }));
            }
        }
    }
};
exports.EmergencyPlanReviewOverdueScanService = EmergencyPlanReviewOverdueScanService;
exports.EmergencyPlanReviewOverdueScanService = EmergencyPlanReviewOverdueScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], EmergencyPlanReviewOverdueScanService);
//# sourceMappingURL=emergency-plan-review-overdue-scan.service.js.map