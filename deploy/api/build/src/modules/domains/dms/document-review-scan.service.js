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
exports.DocumentReviewScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const review_schedule_scan_1 = require("./review-schedule-scan");
// TDD §13.1/§9 pola job cross-tenant (sama persis WorkflowSlaScanService 0.9/
// ReminderScanService 1.1): bootstrap read-only via role admin, tiap tenant
// diproses lewat tenantContextStorage+withRls() (RLS penuh).
//
// PRD §4.3 poin 2 (H-30 reminder) + BR-06 (overdue) DIGABUNG SATU scan (pola
// sama delegation-scan 1.4 yang menggabung BR-08+task-rerouting) — keduanya
// operasi atas TABEL yang SAMA (document_review_schedule), bukan 2 konsep
// terpisah. Satu row BISA masuk KEDUA kandidat sekaligus (job yang lama
// absen: sudah lewat due date DAN belum pernah dapat reminder) — dedup ke
// SATU notifikasi per row per scan pass, BUKAN dua.
let DocumentReviewScanService = class DocumentReviewScanService {
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
      SELECT DISTINCT tenant_id FROM document_review_schedule WHERE status IN ('SCHEDULED', 'IN_PROGRESS')
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "document-review-scan gagal untuk satu tenant", {
                    module: "dms",
                    action: "document-review-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const notifications = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const schedules = await tx.documentReviewSchedule.findMany({
                where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
                include: { document: { select: { title: true, ownerUserId: true } } },
            });
            const candidates = schedules.map((s) => ({
                reviewScheduleId: s.id,
                scheduledReviewDate: s.scheduledReviewDate,
                actualReviewDate: s.actualReviewDate,
                reviewReminderSentAt: s.reviewReminderSentAt,
            }));
            const dueForReminderIds = new Set((0, review_schedule_scan_1.findReviewsDueForReminder)(candidates, now).map((c) => c.reviewScheduleId));
            const overdueIds = new Set((0, review_schedule_scan_1.findOverdueReviewSchedules)(candidates, now).map((c) => c.reviewScheduleId));
            const toNotifyIds = new Set([...dueForReminderIds, ...overdueIds]);
            if (toNotifyIds.size === 0) {
                return [];
            }
            if (dueForReminderIds.size > 0) {
                await tx.documentReviewSchedule.updateMany({
                    where: { id: { in: [...dueForReminderIds] } },
                    data: { reviewReminderSentAt: now },
                });
            }
            if (overdueIds.size > 0) {
                await tx.documentReviewSchedule.updateMany({
                    where: { id: { in: [...overdueIds] } },
                    data: { status: "OVERDUE" },
                });
            }
            this.logger.event("info", "document-review-scan: reminder/overdue diproses", {
                module: "dms",
                action: "document-review-scan.processed",
                tenant_id: tenantId,
                reminder_count: dueForReminderIds.size,
                overdue_count: overdueIds.size,
            });
            const byId = new Map(schedules.map((s) => [s.id, s]));
            return [...toNotifyIds].map((id) => {
                const schedule = byId.get(id);
                return {
                    documentId: schedule.documentId,
                    recipientUserId: schedule.document.ownerUserId,
                    title: schedule.document.title,
                    scheduledReviewDate: schedule.scheduledReviewDate.toISOString().slice(0, 10),
                };
            });
        }));
        // NotificationService.enqueue() membuka withRls()-nya sendiri —
        // dipanggil SETELAH transaksi di atas commit, pola sama seluruh call
        // site lain modul ini.
        for (const n of notifications) {
            await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                eventType: "DOCUMENT_REVIEW_DUE",
                entityType: "DOCUMENT",
                entityId: n.documentId,
                recipientUserId: n.recipientUserId,
                priority: "MEDIUM",
                eventCategory: "DOCUMENT",
                variables: { title: n.title, scheduledReviewDate: n.scheduledReviewDate },
            }));
        }
    }
};
exports.DocumentReviewScanService = DocumentReviewScanService;
exports.DocumentReviewScanService = DocumentReviewScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], DocumentReviewScanService);
