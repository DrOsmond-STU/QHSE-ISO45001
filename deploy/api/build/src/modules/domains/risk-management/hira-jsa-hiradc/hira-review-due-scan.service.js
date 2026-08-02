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
exports.HiraReviewDueScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../../platform/tenancy/tenant-context");
const hira_review_due_scan_1 = require("./hira-review-due-scan");
// TDD §13.1/§9 pola job cross-tenant. PRD §8 baris 2 — "Mendekati
// review_due_date HIRA -> Pemilik HIRA." "Pemilik HIRA" dibaca sbg
// hira_assessments.created_by — skema §5 TIDAK py kolom "owner_user_id"
// terpisah utk HIRA (beda dari documents.owner_user_id 2.1), createdBy
// adalah referensi user LANGSUNG paling dekat maknanya "pemilik" (penulis/
// penanggung jawab assessment) yang tersedia.
let HiraReviewDueScanService = class HiraReviewDueScanService {
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
      SELECT DISTINCT tenant_id FROM hira_assessments WHERE status = 'ACTIVE' AND review_due_date IS NOT NULL
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "hira-review-due-scan gagal untuk satu tenant", {
                    module: "risk-management",
                    action: "hira-review-due-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const notifications = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const hiras = await tx.hiraAssessment.findMany({ where: { status: "ACTIVE", reviewDueDate: { not: null }, deletedAt: null } });
            if (hiras.length === 0)
                return [];
            const candidates = hiras.map((h) => ({
                hiraId: h.id,
                reviewDueDate: h.reviewDueDate,
                status: h.status,
                reviewReminderSentAt: h.reviewReminderSentAt,
            }));
            const dueIds = (0, hira_review_due_scan_1.findHiraAssessmentsDueForReviewReminder)(candidates, now).map((c) => c.hiraId);
            if (dueIds.length === 0)
                return [];
            await tx.hiraAssessment.updateMany({ where: { id: { in: dueIds } }, data: { reviewReminderSentAt: now } });
            this.logger.event("info", "hira-review-due-scan: reminder diproses", {
                module: "risk-management",
                action: "hira-review-due-scan.processed",
                tenant_id: tenantId,
                reminder_count: dueIds.length,
            });
            const byId = new Map(hiras.map((h) => [h.id, h]));
            return dueIds.map((hiraId) => {
                const hira = byId.get(hiraId);
                return {
                    hiraId,
                    recipientUserId: hira.createdBy,
                    hiraNumber: hira.hiraNumber,
                    reviewDueDate: hira.reviewDueDate.toISOString().slice(0, 10),
                };
            });
        }));
        for (const n of notifications) {
            await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                eventType: "HIRA_REVIEW_DUE",
                entityType: "HIRA_ASSESSMENT",
                entityId: n.hiraId,
                recipientUserId: n.recipientUserId,
                priority: "MEDIUM",
                eventCategory: "RISK",
                variables: { hiraNumber: n.hiraNumber, reviewDueDate: n.reviewDueDate },
            }));
        }
    }
};
exports.HiraReviewDueScanService = HiraReviewDueScanService;
exports.HiraReviewDueScanService = HiraReviewDueScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], HiraReviewDueScanService);
