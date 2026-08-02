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
exports.WasteStorageDurationScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const waste_rules_1 = require("./waste-rules");
/**
 * BR-03/PRD §8 "waste_generation_log mendekati max_storage_duration_days
 * (H-7) | TPS LB3 Officer, HSE Manager | In-app, Email". Struktur pola
 * PERSIS CapaRootCauseSlaScanService (4.2): idempotency updateMany DI
 * DALAM transaksi withRls, enqueue() loop DI LUAR (hindari nested
 * $transaction, lihat memory).
 */
let WasteStorageDurationScanService = class WasteStorageDurationScanService {
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
      SELECT DISTINCT tenant_id FROM waste_generation_log
      WHERE linked_waste_manifest_id IS NULL AND storage_duration_warning_sent_at IS NULL
        AND storage_start_date IS NOT NULL AND max_storage_duration_days IS NOT NULL
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "waste-storage-duration-scan gagal untuk satu tenant", {
                    module: "environmental",
                    action: "waste-storage-duration-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const notifications = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const logs = await tx.wasteGenerationLog.findMany({
                where: { linkedWasteManifestId: null, storageDurationWarningSentAt: null, storageStartDate: { not: null }, maxStorageDurationDays: { not: null }, deletedAt: null },
                select: { id: true, wasteName: true, storageLocation: true, storageStartDate: true, maxStorageDurationDays: true },
            });
            const due = logs.filter((l) => (0, waste_rules_1.isStorageDurationWarningDue)(l.storageStartDate, l.maxStorageDurationDays, now));
            if (due.length === 0)
                return [];
            await tx.wasteGenerationLog.updateMany({
                where: { id: { in: due.map((d) => d.id) } },
                data: { storageDurationWarningSentAt: now },
            });
            this.logger.event("info", "waste-storage-duration-scan: reminder diproses", {
                module: "environmental",
                action: "waste-storage-duration-scan.processed",
                tenant_id: tenantId,
                due_count: due.length,
            });
            const recipients = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: { in: ["TPS_LB3_OFFICER", "HSE_MANAGER"] } } } } },
                select: { id: true },
            });
            const recipientIds = recipients.map((r) => r.id);
            return due.map((d) => ({
                wasteGenerationLogId: d.id,
                recipientUserIds: recipientIds,
                variables: { wasteName: d.wasteName, storageLocation: d.storageLocation ?? "-" },
            }));
        }));
        for (const n of notifications) {
            for (const recipientUserId of n.recipientUserIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: "ENVIRONMENTAL_WASTE_STORAGE_DURATION_WARNING",
                    entityType: "WASTE_GENERATION_LOG",
                    entityId: n.wasteGenerationLogId,
                    recipientUserId,
                    priority: "MEDIUM",
                    eventCategory: "ENVIRONMENTAL",
                    variables: n.variables,
                }));
            }
        }
    }
};
exports.WasteStorageDurationScanService = WasteStorageDurationScanService;
exports.WasteStorageDurationScanService = WasteStorageDurationScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], WasteStorageDurationScanService);
//# sourceMappingURL=waste-storage-duration-scan.service.js.map