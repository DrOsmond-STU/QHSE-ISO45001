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
exports.MaintenanceDueScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const asset_lifecycle_1 = require("./asset-lifecycle");
/**
 * PRD §8 baris 1-2 — "next_due_date mendekati (H-7)" + "Maintenance
 * terlambat (overdue)", KEDUANYA date-driven dari maintenance_schedules.next_due_date
 * yang SAMA, digabung SATU scan pass (pola beda dari modul lain yang selalu
 * satu event per scan job — di sini dua event literal PRD berbagi satu
 * kolom tanggal sumber, jadi satu query cukup). Struktur pola PERSIS
 * WasteStorageDurationScanService (5.2): idempotency updateMany DI DALAM
 * transaksi withRls, enqueue() loop DI LUAR (hindari nested $transaction).
 * Penerima "Facility Officer/PIC" (§8) dibaca sbg maintenance_schedules.responsible_role_id
 * kalau diisi (PRD §5 "Default PIC"), fallback SUPERVISOR (pemetaan
 * "Facility Officer" -> SUPERVISOR, pola sama Emergency Response 3.7) kalau
 * NULL — gap TDD §26 (PRD tidak eksplisit jelaskan resolusi ini).
 */
let MaintenanceDueScanService = class MaintenanceDueScanService {
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
      SELECT DISTINCT tenant_id FROM maintenance_schedules
      WHERE is_active = true AND (due_soon_reminder_sent_at IS NULL OR overdue_notified_at IS NULL)
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "maintenance-due-scan gagal untuk satu tenant", {
                    module: "asset_equipment",
                    action: "maintenance-due-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const notifications = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const schedules = await tx.maintenanceSchedule.findMany({
                where: {
                    tenantId,
                    isActive: true,
                    OR: [{ dueSoonReminderSentAt: null }, { overdueNotifiedAt: null }],
                },
                include: { asset: { select: { assetName: true, assetCode: true } } },
            });
            const dueSoon = schedules.filter((s) => s.dueSoonReminderSentAt === null && (0, asset_lifecycle_1.isMaintenanceDueSoon)(s.nextDueDate, now));
            const overdue = schedules.filter((s) => s.overdueNotifiedAt === null && (0, asset_lifecycle_1.isMaintenanceOverdue)(s.nextDueDate, now));
            if (dueSoon.length === 0 && overdue.length === 0)
                return [];
            if (dueSoon.length > 0) {
                await tx.maintenanceSchedule.updateMany({ where: { id: { in: dueSoon.map((s) => s.id) } }, data: { dueSoonReminderSentAt: now } });
            }
            if (overdue.length > 0) {
                await tx.maintenanceSchedule.updateMany({ where: { id: { in: overdue.map((s) => s.id) } }, data: { overdueNotifiedAt: now } });
            }
            this.logger.event("info", "maintenance-due-scan: reminder diproses", {
                module: "asset_equipment",
                action: "maintenance-due-scan.processed",
                tenant_id: tenantId,
                due_soon_count: dueSoon.length,
                overdue_count: overdue.length,
            });
            const resolveRecipients = async (responsibleRoleId) => {
                const roleCodes = responsibleRoleId ? undefined : ["SUPERVISOR"];
                const recipients = await tx.user.findMany({
                    where: {
                        tenantId,
                        status: "ACTIVE",
                        userRoles: responsibleRoleId ? { some: { roleId: responsibleRoleId } } : { some: { role: { roleCode: { in: roleCodes } } } },
                    },
                    select: { id: true },
                });
                return recipients.map((r) => r.id);
            };
            const hseManagers = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
                select: { id: true },
            });
            const result = [];
            for (const s of dueSoon) {
                result.push({
                    eventType: "ASSET_EQUIPMENT_MAINTENANCE_DUE_SOON",
                    maintenanceScheduleId: s.id,
                    recipientUserIds: await resolveRecipients(s.responsibleRoleId),
                    variables: { assetName: s.asset.assetName, assetCode: s.asset.assetCode, dueDate: s.nextDueDate.toISOString().slice(0, 10) },
                });
            }
            for (const s of overdue) {
                const recipientUserIds = [...(await resolveRecipients(s.responsibleRoleId)), ...hseManagers.map((r) => r.id)];
                result.push({
                    eventType: "ASSET_EQUIPMENT_MAINTENANCE_OVERDUE",
                    maintenanceScheduleId: s.id,
                    recipientUserIds: [...new Set(recipientUserIds)],
                    variables: { assetName: s.asset.assetName, assetCode: s.asset.assetCode, daysOverdue: String((0, asset_lifecycle_1.calculateDaysOverdue)(s.nextDueDate, now)) },
                });
            }
            return result;
        }));
        for (const n of notifications) {
            for (const recipientUserId of n.recipientUserIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: n.eventType,
                    entityType: "MAINTENANCE_SCHEDULE",
                    entityId: n.maintenanceScheduleId,
                    recipientUserId,
                    priority: n.eventType === "ASSET_EQUIPMENT_MAINTENANCE_OVERDUE" ? "HIGH" : "MEDIUM",
                    eventCategory: "ASSET_EQUIPMENT",
                    variables: n.variables,
                }));
            }
        }
    }
};
exports.MaintenanceDueScanService = MaintenanceDueScanService;
exports.MaintenanceDueScanService = MaintenanceDueScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], MaintenanceDueScanService);
