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
exports.WorkPermitExpiryScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const work_permit_expiry_scan_1 = require("./work-permit-expiry-scan");
// TDD §13.1/§9 pola job cross-tenant (sama persis HiradcExpiryScanService,
// 3.2). BR-07 (PRD §6) — "permit yang melewati batas waktu tanpa
// extension disetujui otomatis berstatus EXPIRED dan dieskalasi" — status
// menjadi guard idempotency ALAMI (permit EXPIRED keluar dari filter
// status IN ('ACTIVE','EXTENSION_REQUESTED') scan berikutnya), TIDAK
// butuh kolom tracking tambahan. E2E-1 acceptance criterion literal
// TASK_INSTRUCTION.md 3.4.
let WorkPermitExpiryScanService = class WorkPermitExpiryScanService {
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
      SELECT DISTINCT tenant_id FROM work_permits WHERE status IN ('ACTIVE', 'EXTENSION_REQUESTED')
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "work-permit-expiry-scan gagal untuk satu tenant", {
                    module: "work-permit",
                    action: "work-permit-expiry-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const { expiredIds, hseManagerIds } = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const permits = await tx.workPermit.findMany({
                where: { status: { in: ["ACTIVE", "EXTENSION_REQUESTED"] }, deletedAt: null },
                select: { id: true, plannedEndDatetime: true, status: true },
            });
            if (permits.length === 0)
                return { expiredIds: [], hseManagerIds: [] };
            const candidates = permits.map((p) => ({
                workPermitId: p.id,
                plannedEndDatetime: p.plannedEndDatetime,
                status: p.status,
            }));
            const expiredIds = (0, work_permit_expiry_scan_1.findExpiredWorkPermits)(candidates, now).map((c) => c.workPermitId);
            if (expiredIds.length === 0)
                return { expiredIds: [], hseManagerIds: [] };
            await tx.workPermit.updateMany({ where: { id: { in: expiredIds } }, data: { status: "EXPIRED" } });
            const hseManagers = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
                select: { id: true },
            });
            this.logger.event("info", "work-permit-expiry-scan: transisi diproses", {
                module: "work-permit",
                action: "work-permit-expiry-scan.processed",
                tenant_id: tenantId,
                expired_count: expiredIds.length,
            });
            return { expiredIds, hseManagerIds: hseManagers.map((m) => m.id) };
        }));
        // PRD §8 "Permit expired tanpa closure -> HSE Manager -> 'Permit
        // {permit_number} EXPIRED tanpa penutupan'".
        for (const workPermitId of expiredIds) {
            const permitNumber = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls((tx) => tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId }, select: { permitNumber: true } })));
            for (const recipientUserId of hseManagerIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: "WORK_PERMIT_EXPIRED",
                    entityType: "WORK_PERMIT",
                    entityId: workPermitId,
                    recipientUserId,
                    priority: "HIGH",
                    eventCategory: "WORK_PERMIT",
                    variables: { permitNumber: permitNumber.permitNumber },
                }));
            }
        }
    }
};
exports.WorkPermitExpiryScanService = WorkPermitExpiryScanService;
exports.WorkPermitExpiryScanService = WorkPermitExpiryScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], WorkPermitExpiryScanService);
