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
exports.QualityComplaintResponseSlaScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const complaint_lifecycle_1 = require("./complaint-lifecycle");
/**
 * BR-02 §8 "SLA respons awal komplain terlewati | Quality Manager,
 * Customer Service Head". TIDAK ADA role baseline "Customer Service Head"
 * terpisah (lihat gap RBAC seed soal Customer Service/Sales dilipat ke
 * WORKER_EMPLOYEE) — disubstitusi `received_by` (orang yang genuinely
 * mencatat komplain ini) + QUALITY_MANAGER tenant-wide, pola sama seluruh
 * scan job lain yang mensubstitusi role PRD tanpa padanan baseline.
 */
let QualityComplaintResponseSlaScanService = class QualityComplaintResponseSlaScanService {
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
      SELECT DISTINCT tenant_id FROM customer_complaints WHERE initial_response_sent_at IS NULL AND response_sla_overdue_notified_at IS NULL
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "quality-complaint-response-sla-scan gagal untuk satu tenant", {
                    module: "quality",
                    action: "quality-complaint-response-sla-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const notifications = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const complaints = await tx.customerComplaint.findMany({
                where: { initialResponseSentAt: null, responseSlaOverdueNotifiedAt: null, deletedAt: null },
                select: { id: true, complaintNumber: true, initialResponseDueDate: true, initialResponseSentAt: true, receivedBy: true },
            });
            if (complaints.length === 0)
                return [];
            const overdueIds = complaints
                .filter((c) => (0, complaint_lifecycle_1.isInitialResponseOverdue)(c.initialResponseDueDate, c.initialResponseSentAt, now))
                .map((c) => c.id);
            if (overdueIds.length === 0)
                return [];
            await tx.customerComplaint.updateMany({ where: { id: { in: overdueIds } }, data: { responseSlaOverdueNotifiedAt: now } });
            this.logger.event("info", "quality-complaint-response-sla-scan: reminder diproses", {
                module: "quality",
                action: "quality-complaint-response-sla-scan.processed",
                tenant_id: tenantId,
                overdue_count: overdueIds.length,
            });
            const qualityManagers = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "QUALITY_MANAGER" } } } },
                select: { id: true },
            });
            const qualityManagerIds = qualityManagers.map((m) => m.id);
            const byId = new Map(complaints.map((c) => [c.id, c]));
            return overdueIds.map((complaintId) => {
                const complaint = byId.get(complaintId);
                return {
                    complaintId,
                    recipientUserIds: [...new Set([complaint.receivedBy, ...qualityManagerIds])],
                    variables: { complaintNumber: complaint.complaintNumber },
                };
            });
        }));
        for (const n of notifications) {
            for (const recipientUserId of n.recipientUserIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: "QUALITY_COMPLAINT_RESPONSE_SLA_OVERDUE",
                    entityType: "CUSTOMER_COMPLAINT",
                    entityId: n.complaintId,
                    recipientUserId,
                    priority: "HIGH",
                    eventCategory: "QUALITY",
                    variables: n.variables,
                }));
            }
        }
    }
};
exports.QualityComplaintResponseSlaScanService = QualityComplaintResponseSlaScanService;
exports.QualityComplaintResponseSlaScanService = QualityComplaintResponseSlaScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], QualityComplaintResponseSlaScanService);
