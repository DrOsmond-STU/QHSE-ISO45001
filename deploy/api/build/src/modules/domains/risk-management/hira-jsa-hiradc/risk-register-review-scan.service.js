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
exports.RiskRegisterReviewScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../../platform/tenancy/tenant-context");
const risk_register_review_scan_1 = require("./risk-register-review-scan");
const risk_treatment_overdue_scan_1 = require("./risk-treatment-overdue-scan");
// TDD §13.1/§9 pola job cross-tenant. PRD §8 baris 3 (risk_register
// overdue, BR-05) + baris 4 (risk_treatment_plans overdue) DIGABUNG SATU
// job — dua tabel BERBEDA (bukan pola "1 tabel 2 concern" spt DMS/
// Compliance), tapi SAMA-SAMA "tinjauan berkala risiko" modul ini,
// dijadwalkan bersama drpd bikin queue terpisah utk masing-masing.
let RiskRegisterReviewScanService = class RiskRegisterReviewScanService {
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
      SELECT DISTINCT tenant_id FROM (
        SELECT tenant_id FROM risk_register WHERE status != 'CLOSED' AND next_review_date IS NOT NULL
        UNION
        SELECT tenant_id FROM risk_treatment_plans WHERE status IN ('PLANNED', 'IN_PROGRESS')
      ) t
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "risk-register-review-scan gagal untuk satu tenant", {
                    module: "risk-management",
                    action: "risk-register-review-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const notifications = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const results = [];
            // BR-05 — risk_register overdue.
            const risks = await tx.riskRegister.findMany({ where: { status: { not: "CLOSED" }, nextReviewDate: { not: null }, deletedAt: null } });
            if (risks.length > 0) {
                const riskCandidates = risks.map((r) => ({
                    riskRegisterId: r.id,
                    nextReviewDate: r.nextReviewDate,
                    status: r.status,
                    overdueNotifiedAt: r.overdueNotifiedAt,
                }));
                const overdueRiskIds = (0, risk_register_review_scan_1.findOverdueRiskRegisterReviews)(riskCandidates, now).map((c) => c.riskRegisterId);
                if (overdueRiskIds.length > 0) {
                    await tx.riskRegister.updateMany({ where: { id: { in: overdueRiskIds } }, data: { overdueNotifiedAt: now } });
                    const hseManagers = await tx.user.findMany({
                        where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
                        select: { id: true },
                    });
                    const byId = new Map(risks.map((r) => [r.id, r]));
                    for (const riskId of overdueRiskIds) {
                        const risk = byId.get(riskId);
                        const recipients = new Set([risk.riskOwnerUserId, ...hseManagers.map((m) => m.id)]);
                        for (const recipientUserId of recipients) {
                            results.push({
                                eventType: "RISK_REGISTER_REVIEW_OVERDUE",
                                entityType: "RISK_REGISTER",
                                entityId: riskId,
                                recipientUserId,
                                variables: { riskTitle: risk.riskTitle },
                            });
                        }
                    }
                }
            }
            // PRD §8 baris 4 — risk_treatment_plans overdue.
            const plans = await tx.riskTreatmentPlan.findMany({ where: { status: { in: ["PLANNED", "IN_PROGRESS"] }, deletedAt: null } });
            if (plans.length > 0) {
                const planCandidates = plans.map((p) => ({
                    riskTreatmentId: p.id,
                    targetDate: p.targetDate,
                    status: p.status,
                    overdueNotifiedAt: p.overdueNotifiedAt,
                }));
                const overduePlanIds = (0, risk_treatment_overdue_scan_1.findOverdueRiskTreatmentPlans)(planCandidates, now).map((c) => c.riskTreatmentId);
                if (overduePlanIds.length > 0) {
                    await tx.riskTreatmentPlan.updateMany({ where: { id: { in: overduePlanIds } }, data: { overdueNotifiedAt: now } });
                    const byId = new Map(plans.map((p) => [p.id, p]));
                    const responsibleUsers = await tx.user.findMany({
                        where: { id: { in: [...new Set(plans.map((p) => p.responsibleUserId))] } },
                        select: { id: true, reportingToUserId: true },
                    });
                    const reportingToById = new Map(responsibleUsers.map((u) => [u.id, u.reportingToUserId]));
                    for (const planId of overduePlanIds) {
                        const plan = byId.get(planId);
                        const recipients = new Set([plan.responsibleUserId]);
                        const superior = reportingToById.get(plan.responsibleUserId);
                        if (superior)
                            recipients.add(superior);
                        for (const recipientUserId of recipients) {
                            results.push({
                                eventType: "RISK_TREATMENT_PLAN_OVERDUE",
                                entityType: "RISK_TREATMENT_PLAN",
                                entityId: planId,
                                recipientUserId,
                                variables: { treatmentDescription: plan.treatmentDescription },
                            });
                        }
                    }
                }
            }
            this.logger.event("info", "risk-register-review-scan: overdue diproses", {
                module: "risk-management",
                action: "risk-register-review-scan.processed",
                tenant_id: tenantId,
                notification_count: results.length,
            });
            return results;
        }));
        for (const n of notifications) {
            await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                eventType: n.eventType,
                entityType: n.entityType,
                entityId: n.entityId,
                recipientUserId: n.recipientUserId,
                priority: "HIGH",
                eventCategory: "RISK",
                variables: n.variables,
            }));
        }
    }
};
exports.RiskRegisterReviewScanService = RiskRegisterReviewScanService;
exports.RiskRegisterReviewScanService = RiskRegisterReviewScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], RiskRegisterReviewScanService);
