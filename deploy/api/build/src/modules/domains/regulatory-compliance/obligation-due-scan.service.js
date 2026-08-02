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
exports.ObligationDueScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const obligation_due_scan_1 = require("./obligation-due-scan");
// TDD §13.1/§9 pola job cross-tenant (sama persis DocumentReviewScanService,
// 2.1). PRD §8 baris 3 (jatuh tempo H-30) + baris 5 (overdue) DIGABUNG SATU
// scan (satu tabel compliance_obligations, pola sama license-expiry-scan/
// document-review-scan).
let ObligationDueScanService = class ObligationDueScanService {
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
      SELECT DISTINCT tenant_id FROM compliance_obligations WHERE status = 'ACTIVE' AND next_due_date IS NOT NULL
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "obligation-due-scan gagal untuk satu tenant", {
                    module: "regulatory-compliance",
                    action: "obligation-due-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const notifications = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const obligations = await tx.complianceObligation.findMany({
                where: { status: "ACTIVE", nextDueDate: { not: null }, deletedAt: null },
            });
            if (obligations.length === 0)
                return [];
            const candidates = obligations.map((o) => ({
                obligationId: o.id,
                nextDueDate: o.nextDueDate,
                status: o.status,
                dueReminderSentAt: o.dueReminderSentAt,
                overdueNotifiedAt: o.overdueNotifiedAt,
            }));
            const dueForReminderIds = new Set((0, obligation_due_scan_1.findObligationsDueForReminder)(candidates, now).map((c) => c.obligationId));
            const overdueIds = new Set((0, obligation_due_scan_1.findOverdueObligations)(candidates, now).map((c) => c.obligationId));
            if (dueForReminderIds.size > 0) {
                await tx.complianceObligation.updateMany({ where: { id: { in: [...dueForReminderIds] } }, data: { dueReminderSentAt: now } });
            }
            if (overdueIds.size > 0) {
                await tx.complianceObligation.updateMany({ where: { id: { in: [...overdueIds] } }, data: { overdueNotifiedAt: now } });
            }
            this.logger.event("info", "obligation-due-scan: reminder/overdue diproses", {
                module: "regulatory-compliance",
                action: "obligation-due-scan.processed",
                tenant_id: tenantId,
                reminder_count: dueForReminderIds.size,
                overdue_count: overdueIds.size,
            });
            if (dueForReminderIds.size === 0 && overdueIds.size === 0)
                return [];
            const hseManagers = overdueIds.size > 0
                ? await tx.user.findMany({
                    where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
                    select: { id: true },
                })
                : [];
            const hseManagerIds = hseManagers.map((m) => m.id);
            const byId = new Map(obligations.map((o) => [o.id, o]));
            const results = [];
            // PRD §8 baris 3 — "Evaluator/PIC obligation" dibaca sbg
            // responsible_user_id (satu-satunya referensi user langsung pada
            // compliance_obligations — belum ada "evaluator" ditunjuk sebelum
            // evaluasi genuinely dibuat). Obligation tanpa responsible_user_id
            // (NULL) dilewati tanpa notifikasi (gap TDD §26).
            for (const obligationId of dueForReminderIds) {
                const obligation = byId.get(obligationId);
                if (!obligation.responsibleUserId)
                    continue;
                results.push({
                    obligationId,
                    recipientUserIds: [obligation.responsibleUserId],
                    eventType: "COMPLIANCE_EVALUATION_DUE",
                    priority: "MEDIUM",
                });
            }
            for (const obligationId of overdueIds) {
                const obligation = byId.get(obligationId);
                const recipients = new Set(hseManagerIds);
                if (obligation.responsibleUserId)
                    recipients.add(obligation.responsibleUserId);
                if (recipients.size === 0)
                    continue;
                results.push({
                    obligationId,
                    recipientUserIds: [...recipients],
                    eventType: "COMPLIANCE_OBLIGATION_OVERDUE",
                    priority: "HIGH",
                });
            }
            return results.map((r) => {
                const obligation = byId.get(r.obligationId);
                return {
                    ...r,
                    obligationDescription: obligation.obligationDescription,
                    nextDueDate: obligation.nextDueDate?.toISOString().slice(0, 10) ?? "",
                };
            });
        }));
        for (const n of notifications) {
            for (const recipientUserId of n.recipientUserIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: n.eventType,
                    entityType: "COMPLIANCE_OBLIGATION",
                    entityId: n.obligationId,
                    recipientUserId,
                    priority: n.priority,
                    eventCategory: "COMPLIANCE",
                    variables: { obligationDescription: n.obligationDescription, nextDueDate: n.nextDueDate },
                }));
            }
        }
    }
};
exports.ObligationDueScanService = ObligationDueScanService;
exports.ObligationDueScanService = ObligationDueScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], ObligationDueScanService);
