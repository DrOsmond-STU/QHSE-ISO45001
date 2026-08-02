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
exports.ContractorDueScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const contractor_due_scan_constants_1 = require("./contractor-due-scan.constants");
const contractor_lifecycle_1 = require("./contractor-lifecycle");
/**
 * PRD §8 baris 1/2/3 (dokumen H-reminder_days_before, dokumen EXPIRED,
 * prakualifikasi H-60) — SATU scan pass gabungan, pola PERSIS
 * CalibrationDueScanService 6.2 (idempotency updateMany DI DALAM withRls,
 * enqueue() loop DI LUAR, hindari nested $transaction). Baris §8
 * "Evaluasi kinerja jadwal terlewat" SENGAJA tidak di sini (TIDAK ADA kolom
 * jadwal apa pun di contractor_performance_evaluations §5 literal utk
 * discan, lihat banner comment seed-contractor-notification-templates.ts).
 * Baris §8 "UNACCEPTABLE 2x berturut" JUGA tidak di sini — event-driven,
 * langsung di ContractorPerformanceEvaluationService.onReviewCompleted().
 */
let ContractorDueScanService = class ContractorDueScanService {
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
      SELECT DISTINCT tenant_id FROM contractor_document_compliance
      WHERE status IN ('VALID', 'EXPIRING_SOON') AND (reminder_sent_at IS NULL OR expired_notified_at IS NULL)
      UNION
      SELECT DISTINCT tenant_id FROM contractor_prequalification
      WHERE status = 'APPROVED' AND valid_until IS NOT NULL AND renewal_reminder_sent_at IS NULL
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "contractor-due-scan gagal untuk satu tenant", {
                    module: "contractor",
                    action: "contractor-due-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const complianceNotifications = await this.scanDocumentCompliance(tenantId, now);
        const prequalificationNotifications = await this.scanPrequalificationRenewal(tenantId, now);
        const notifications = [...complianceNotifications, ...prequalificationNotifications];
        for (const n of notifications) {
            for (const recipientUserId of n.recipientUserIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: n.eventType,
                    entityType: n.entityType,
                    entityId: n.entityId,
                    recipientUserId,
                    priority: n.priority,
                    eventCategory: "CONTRACTOR",
                    variables: n.variables,
                }));
            }
        }
    }
    // §8 baris 1/2 — reminder H-reminder_days_before (PER-BARIS, BUKAN tier
    // tetap spt Calibration) + transisi EXPIRED.
    async scanDocumentCompliance(tenantId, now) {
        return tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const records = await tx.contractorDocumentCompliance.findMany({
                where: { tenantId, status: { in: ["VALID", "EXPIRING_SOON"] }, OR: [{ reminderSentAt: null }, { expiredNotifiedAt: null }] },
                include: { contractor: { select: { contractorName: true } } },
            });
            if (records.length === 0)
                return [];
            const coordinators = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_OFFICER" } } } },
                select: { id: true },
            });
            const hseManagers = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
                select: { id: true },
            });
            const expiringSoonRecipients = coordinators.map((u) => u.id);
            const expiredRecipients = [...new Set([...coordinators, ...hseManagers].map((u) => u.id))];
            const result = [];
            for (const r of records) {
                const contractorName = r.contractor.contractorName;
                if (r.expiredNotifiedAt === null && (0, contractor_lifecycle_1.isComplianceExpired)(r.expiryDate, now)) {
                    await tx.contractorDocumentCompliance.updateMany({ where: { id: r.id }, data: { status: "EXPIRED", expiredNotifiedAt: now } });
                    result.push({
                        eventType: "CONTRACTOR_DOCUMENT_EXPIRED",
                        entityType: "CONTRACTOR_DOCUMENT_COMPLIANCE",
                        entityId: r.id,
                        recipientUserIds: expiredRecipients,
                        priority: "HIGH",
                        variables: { contractorName, documentCategory: r.documentCategory },
                    });
                    continue;
                }
                if (r.reminderSentAt === null && (0, contractor_lifecycle_1.isWithinComplianceReminderWindow)(r.expiryDate, now, r.reminderDaysBefore)) {
                    await tx.contractorDocumentCompliance.updateMany({ where: { id: r.id }, data: { status: "EXPIRING_SOON", reminderSentAt: now } });
                    result.push({
                        eventType: "CONTRACTOR_DOCUMENT_EXPIRING_SOON",
                        entityType: "CONTRACTOR_DOCUMENT_COMPLIANCE",
                        entityId: r.id,
                        recipientUserIds: expiringSoonRecipients,
                        priority: "MEDIUM",
                        variables: { contractorName, documentCategory: r.documentCategory, expiryDate: r.expiryDate.toISOString().slice(0, 10) },
                    });
                }
            }
            this.logger.event("info", "contractor-due-scan: dokumen kepatuhan diproses", {
                module: "contractor",
                action: "contractor-due-scan.compliance-processed",
                tenant_id: tenantId,
                notification_count: result.length,
            });
            return result;
        }));
    }
    // §8 baris 3 — prakualifikasi valid_until mendekati H-60.
    async scanPrequalificationRenewal(tenantId, now) {
        return tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const records = await tx.contractorPrequalification.findMany({
                where: { tenantId, status: "APPROVED", validUntil: { not: null }, renewalReminderSentAt: null },
                include: { contractor: { select: { contractorName: true } } },
            });
            const dueSoon = records.filter((r) => r.validUntil && (0, contractor_lifecycle_1.isWithinComplianceReminderWindow)(r.validUntil, now, contractor_due_scan_constants_1.PREQUALIFICATION_RENEWAL_WARNING_WINDOW_DAYS));
            if (dueSoon.length === 0)
                return [];
            await tx.contractorPrequalification.updateMany({ where: { id: { in: dueSoon.map((r) => r.id) } }, data: { renewalReminderSentAt: now } });
            const coordinators = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_OFFICER" } } } },
                select: { id: true },
            });
            const recipientIds = coordinators.map((u) => u.id);
            this.logger.event("info", "contractor-due-scan: prakualifikasi diproses", {
                module: "contractor",
                action: "contractor-due-scan.prequalification-processed",
                tenant_id: tenantId,
                notification_count: dueSoon.length,
            });
            return dueSoon.map((r) => ({
                eventType: "CONTRACTOR_PREQUALIFICATION_EXPIRING",
                entityType: "CONTRACTOR_PREQUALIFICATION",
                entityId: r.id,
                recipientUserIds: recipientIds,
                priority: "MEDIUM",
                variables: { contractorName: r.contractor.contractorName, validUntil: r.validUntil.toISOString().slice(0, 10) },
            }));
        }));
    }
};
exports.ContractorDueScanService = ContractorDueScanService;
exports.ContractorDueScanService = ContractorDueScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], ContractorDueScanService);
