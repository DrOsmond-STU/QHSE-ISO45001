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
exports.McuReminderScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const mcu_lifecycle_1 = require("./mcu-lifecycle");
/**
 * PRD §8 baris 1 — "MCU jatuh tempo (H-14/H-7/H-1) | Karyawan bersangkutan,
 * Occupational Health Staff | In-app, Email". Struktur pola PERSIS
 * WasteStorageDurationScanService (5.2): idempotency updateMany DI DALAM
 * transaksi withRls, enqueue() loop DI LUAR.
 */
let McuReminderScanService = class McuReminderScanService {
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
      SELECT DISTINCT tenant_id FROM mcu_schedules
      WHERE reminder_sent_at IS NULL AND status IN ('SCHEDULED', 'RESCHEDULED')
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "mcu-reminder-scan gagal untuk satu tenant", {
                    module: "occupational_health",
                    action: "mcu-reminder-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const notifications = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const schedules = await tx.mcuSchedule.findMany({
                where: { tenantId, reminderSentAt: null, status: { in: ["SCHEDULED", "RESCHEDULED"] }, deletedAt: null },
                select: { id: true, employeeUserId: true, scheduledDate: true },
            });
            const due = schedules.filter((s) => (0, mcu_lifecycle_1.isMcuReminderDue)(s.scheduledDate, now, null));
            if (due.length === 0)
                return [];
            await tx.mcuSchedule.updateMany({
                where: { id: { in: due.map((d) => d.id) } },
                data: { reminderSentAt: now },
            });
            this.logger.event("info", "mcu-reminder-scan: reminder diproses", {
                module: "occupational_health",
                action: "mcu-reminder-scan.processed",
                tenant_id: tenantId,
                due_count: due.length,
            });
            const ohStaff = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "OCCUPATIONAL_HEALTH_STAFF" } } } },
                select: { id: true },
            });
            const ohStaffIds = ohStaff.map((u) => u.id);
            return due.map((d) => ({
                mcuScheduleId: d.id,
                employeeUserId: d.employeeUserId,
                recipientUserIds: [d.employeeUserId, ...ohStaffIds],
                scheduledDate: d.scheduledDate.toISOString().slice(0, 10),
            }));
        }));
        for (const n of notifications) {
            for (const recipientUserId of n.recipientUserIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: "OCCUPATIONAL_HEALTH_MCU_DUE",
                    entityType: "MCU_SCHEDULE",
                    entityId: n.mcuScheduleId,
                    recipientUserId,
                    priority: "MEDIUM",
                    eventCategory: "OCCUPATIONAL_HEALTH",
                    variables: { scheduledDate: n.scheduledDate },
                }));
            }
        }
    }
};
exports.McuReminderScanService = McuReminderScanService;
exports.McuReminderScanService = McuReminderScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], McuReminderScanService);
//# sourceMappingURL=mcu-reminder-scan.service.js.map