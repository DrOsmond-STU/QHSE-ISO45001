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
exports.InspectionRecordOverdueScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const inspection_record_overdue_scan_1 = require("./inspection-record-overdue-scan");
// TDD §13.1/§9 pola job cross-tenant (sama persis scan job modul lain).
// BR-06 (reinterpretasi level-record, lihat banner comment
// inspection-record-overdue-scan.ts) — status menjadi guard idempotency
// alami (baris OVERDUE keluar dari filter status IN (SCHEDULED,IN_PROGRESS)
// scan berikutnya, sampai Inspector start()/complete() memindahkannya).
let InspectionRecordOverdueScanService = class InspectionRecordOverdueScanService {
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
      SELECT DISTINCT tenant_id FROM inspection_records WHERE status IN ('SCHEDULED', 'IN_PROGRESS')
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "inspection-record-overdue-scan gagal untuk satu tenant", {
                    module: "inspection",
                    action: "inspection-record-overdue-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const { overdueIds, hseManagerIds } = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const records = await tx.inspectionRecord.findMany({
                where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] }, deletedAt: null },
                select: { id: true, plannedDate: true },
            });
            if (records.length === 0)
                return { overdueIds: [], hseManagerIds: [] };
            const candidates = records.map((r) => ({ recordId: r.id, plannedDate: r.plannedDate }));
            const overdueIds = (0, inspection_record_overdue_scan_1.findOverdueInspectionRecords)(candidates, now).map((c) => c.recordId);
            if (overdueIds.length === 0)
                return { overdueIds: [], hseManagerIds: [] };
            await tx.inspectionRecord.updateMany({ where: { id: { in: overdueIds } }, data: { status: "OVERDUE" } });
            const hseManagers = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
                select: { id: true },
            });
            this.logger.event("info", "inspection-record-overdue-scan: transisi diproses", {
                module: "inspection",
                action: "inspection-record-overdue-scan.processed",
                tenant_id: tenantId,
                overdue_count: overdueIds.length,
            });
            return { overdueIds, hseManagerIds: hseManagers.map((m) => m.id) };
        }));
        for (const recordId of overdueIds) {
            const record = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls((tx) => tx.inspectionRecord.findUniqueOrThrow({ where: { id: recordId }, select: { inspectionRecordNumber: true, inspectorId: true } })));
            const recipients = new Set([record.inspectorId, ...hseManagerIds]);
            for (const recipientUserId of recipients) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: "INSPECTION_RECORD_OVERDUE",
                    entityType: "INSPECTION_RECORD",
                    entityId: recordId,
                    recipientUserId,
                    priority: "HIGH",
                    eventCategory: "INSPECTION",
                    variables: { inspectionRecordNumber: record.inspectionRecordNumber ?? recordId },
                }));
            }
        }
    }
};
exports.InspectionRecordOverdueScanService = InspectionRecordOverdueScanService;
exports.InspectionRecordOverdueScanService = InspectionRecordOverdueScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], InspectionRecordOverdueScanService);
