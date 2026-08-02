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
exports.ReadAcknowledgementScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const read_acknowledgement_scan_1 = require("./read-acknowledgement-scan");
// TDD §13.1/§9 pola job cross-tenant. BR-04 (PRD §6): "Melewati
// acknowledgement_due_days tanpa acknowledge -> status -> OVERDUE, eskalasi
// notifikasi ke user & atasannya." dueAt dihitung dari PARENT
// document_distribution (distributedAt + acknowledgementDueDays) — TIDAK
// ada kolom itu di read_acknowledgement_logs sendiri (PRD §5).
let ReadAcknowledgementScanService = class ReadAcknowledgementScanService {
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
      SELECT DISTINCT tenant_id FROM read_acknowledgement_logs WHERE status IN ('PENDING', 'VIEWED')
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "read-acknowledgement-scan gagal untuk satu tenant", {
                    module: "dms",
                    action: "read-acknowledgement-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const notifications = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const logs = await tx.readAcknowledgementLog.findMany({
                where: { status: { in: ["PENDING", "VIEWED"] } },
                include: {
                    documentDistribution: { select: { distributedAt: true, acknowledgementDueDays: true, requiresAcknowledgement: true } },
                    documentVersion: { select: { document: { select: { title: true } } } },
                    user: { select: { reportingToUserId: true } },
                },
            });
            const candidates = logs.map((log) => {
                const { distributedAt, acknowledgementDueDays, requiresAcknowledgement } = log.documentDistribution;
                const dueAt = requiresAcknowledgement && acknowledgementDueDays !== null
                    ? new Date(distributedAt.getTime() + acknowledgementDueDays * 24 * 60 * 60 * 1000)
                    : null;
                return { ackLogId: log.id, status: log.status, dueAt };
            });
            const overdueIds = (0, read_acknowledgement_scan_1.findOverdueAcknowledgements)(candidates, now).map((c) => c.ackLogId);
            if (overdueIds.length === 0) {
                return [];
            }
            await tx.readAcknowledgementLog.updateMany({ where: { id: { in: overdueIds } }, data: { status: "OVERDUE" } });
            this.logger.event("info", "read-acknowledgement-scan: BR-04 overdue diproses", {
                module: "dms",
                action: "read-acknowledgement-scan.processed",
                tenant_id: tenantId,
                overdue_count: overdueIds.length,
            });
            const byId = new Map(logs.map((l) => [l.id, l]));
            return overdueIds.flatMap((id) => {
                const log = byId.get(id);
                const title = log.documentVersion.document.title;
                const recipients = [log.userId, ...(log.user.reportingToUserId ? [log.user.reportingToUserId] : [])];
                return recipients.map((recipientUserId) => ({ recipientUserId, title, ackLogId: log.id }));
            });
        }));
        for (const n of notifications) {
            await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                eventType: "DOCUMENT_ACKNOWLEDGEMENT_OVERDUE",
                entityType: "READ_ACKNOWLEDGEMENT_LOG",
                entityId: n.ackLogId,
                recipientUserId: n.recipientUserId,
                priority: "MEDIUM",
                eventCategory: "DOCUMENT",
                variables: { title: n.title },
            }));
        }
    }
};
exports.ReadAcknowledgementScanService = ReadAcknowledgementScanService;
exports.ReadAcknowledgementScanService = ReadAcknowledgementScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], ReadAcknowledgementScanService);
