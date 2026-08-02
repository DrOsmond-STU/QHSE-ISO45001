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
exports.CalibrationDueScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const calibration_due_scan_constants_1 = require("./calibration-due-scan.constants");
const calibration_lifecycle_1 = require("./calibration-lifecycle");
const TIER_COLUMN_BY_DAYS = {
    30: "reminderSentAtDay30",
    14: "reminderSentAtDay14",
    7: "reminderSentAtDay7",
    1: "reminderSentAtDay1",
};
/**
 * PRD §8 baris 1/2/5 (H-30/14/7/1 due-soon, OVERDUE, akreditasi provider
 * H-60) + BR-09 (transisi status OVERDUE) — SATU scan pass gabungan, pola
 * PERSIS MaintenanceDueScanService 6.1 (idempotency updateMany DI DALAM
 * withRls, enqueue() loop DI LUAR, hindari nested $transaction). Baris §8
 * "Sertifikat menunggu review" SENGAJA tidak di sini (Workflow Engine task
 * sudah cukup, lihat banner comment seed-calibration-notification-templates.ts).
 */
let CalibrationDueScanService = class CalibrationDueScanService {
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
      SELECT DISTINCT tenant_id FROM calibration_schedules
      WHERE status IN ('SCHEDULED', 'IN_PROGRESS', 'RESCHEDULED')
        AND (reminder_sent_at_day30 IS NULL OR reminder_sent_at_day14 IS NULL OR reminder_sent_at_day7 IS NULL OR reminder_sent_at_day1 IS NULL OR overdue_notified_at IS NULL)
      UNION
      SELECT DISTINCT tenant_id FROM calibration_providers
      WHERE is_active = true AND accreditation_valid_until IS NOT NULL AND accreditation_expiry_warning_sent_at IS NULL
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "calibration-due-scan gagal untuk satu tenant", {
                    module: "calibration",
                    action: "calibration-due-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const scheduleNotifications = await this.scanSchedules(tenantId, now);
        const providerNotifications = await this.scanProviders(tenantId, now);
        const notifications = [...scheduleNotifications, ...providerNotifications];
        for (const n of notifications) {
            for (const recipientUserId of n.recipientUserIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: n.eventType,
                    entityType: n.entityType,
                    entityId: n.entityId,
                    recipientUserId,
                    priority: n.priority,
                    eventCategory: "CALIBRATION",
                    variables: n.variables,
                }));
            }
        }
    }
    async scanSchedules(tenantId, now) {
        return tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const schedules = await tx.calibrationSchedule.findMany({
                where: {
                    tenantId,
                    status: { in: ["SCHEDULED", "IN_PROGRESS", "RESCHEDULED"] },
                    OR: [
                        { reminderSentAtDay30: null },
                        { reminderSentAtDay14: null },
                        { reminderSentAtDay7: null },
                        { reminderSentAtDay1: null },
                        { overdueNotifiedAt: null },
                    ],
                },
                include: { calibrationItem: { select: { equipmentTagNo: true, id: true } } },
            });
            if (schedules.length === 0)
                return [];
            const coordinators = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "QC_INSPECTOR" } } } },
                select: { id: true },
            });
            const custodians = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "SUPERVISOR" } } } },
                select: { id: true },
            });
            const hseManagers = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
                select: { id: true },
            });
            const dueSoonRecipients = [...new Set([...coordinators, ...custodians].map((u) => u.id))];
            const overdueRecipients = [...new Set([...coordinators, ...hseManagers].map((u) => u.id))];
            const result = [];
            for (const s of schedules) {
                const tagNo = s.calibrationItem.equipmentTagNo ?? "";
                // BR-09 — transisi OVERDUE (dicek LEBIH DULU, mengecualikan tier
                // reminder due-soon yang jadi tidak relevan lagi kalau sudah lewat).
                if (s.overdueNotifiedAt === null && (0, calibration_lifecycle_1.isCalibrationScheduleOverdue)(s.dueDate, now)) {
                    await tx.calibrationSchedule.updateMany({
                        where: { id: s.id },
                        data: { status: "OVERDUE", overdueNotifiedAt: now },
                    });
                    result.push({
                        eventType: "CALIBRATION_SCHEDULE_OVERDUE",
                        entityType: "CALIBRATION_SCHEDULE",
                        entityId: s.id,
                        recipientUserIds: overdueRecipients,
                        priority: "HIGH",
                        variables: { equipmentTagNo: tagNo, dueDate: s.dueDate.toISOString().slice(0, 10) },
                    });
                    continue;
                }
                // Tier due-soon — CATCH-UP semantics (lebih dari satu tier bisa
                // terkirim sekaligus kalau scan sempat mati beberapa hari, pola
                // sama licenses_permits 2.2).
                for (const tierDays of calibration_due_scan_constants_1.CALIBRATION_REMINDER_TIERS_DAYS) {
                    const column = TIER_COLUMN_BY_DAYS[tierDays];
                    if (s[column] !== null)
                        continue;
                    if (!(0, calibration_lifecycle_1.isWithinReminderWindow)(s.dueDate, now, tierDays))
                        continue;
                    await tx.calibrationSchedule.updateMany({ where: { id: s.id }, data: { [column]: now } });
                    result.push({
                        eventType: "CALIBRATION_DUE_SOON",
                        entityType: "CALIBRATION_SCHEDULE",
                        entityId: s.id,
                        recipientUserIds: dueSoonRecipients,
                        priority: "MEDIUM",
                        variables: { equipmentTagNo: tagNo, dueDate: s.dueDate.toISOString().slice(0, 10) },
                    });
                }
            }
            this.logger.event("info", "calibration-due-scan: jadwal diproses", {
                module: "calibration",
                action: "calibration-due-scan.schedules-processed",
                tenant_id: tenantId,
                notification_count: result.length,
            });
            return result;
        }));
    }
    async scanProviders(tenantId, now) {
        return tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const providers = await tx.calibrationProvider.findMany({
                where: { tenantId, isActive: true, accreditationValidUntil: { not: null }, accreditationExpiryWarningSentAt: null },
            });
            const dueSoon = providers.filter((p) => p.accreditationValidUntil && (0, calibration_lifecycle_1.isWithinReminderWindow)(p.accreditationValidUntil, now, calibration_due_scan_constants_1.CALIBRATION_PROVIDER_ACCREDITATION_WARNING_WINDOW_DAYS));
            if (dueSoon.length === 0)
                return [];
            await tx.calibrationProvider.updateMany({
                where: { id: { in: dueSoon.map((p) => p.id) } },
                data: { accreditationExpiryWarningSentAt: now },
            });
            const coordinators = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "QC_INSPECTOR" } } } },
                select: { id: true },
            });
            const recipientIds = coordinators.map((u) => u.id);
            this.logger.event("info", "calibration-due-scan: provider diproses", {
                module: "calibration",
                action: "calibration-due-scan.providers-processed",
                tenant_id: tenantId,
                notification_count: dueSoon.length,
            });
            return dueSoon.map((p) => ({
                eventType: "CALIBRATION_PROVIDER_ACCREDITATION_EXPIRING",
                entityType: "CALIBRATION_PROVIDER",
                entityId: p.id,
                recipientUserIds: recipientIds,
                priority: "MEDIUM",
                variables: { providerName: p.providerName, accreditationValidUntil: p.accreditationValidUntil.toISOString().slice(0, 10) },
            }));
        }));
    }
};
exports.CalibrationDueScanService = CalibrationDueScanService;
exports.CalibrationDueScanService = CalibrationDueScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], CalibrationDueScanService);
