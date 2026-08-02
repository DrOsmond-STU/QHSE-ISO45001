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
exports.GasRetestDueScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const work_permit_gas_retest_scan_1 = require("./work-permit-gas-retest-scan");
const work_permit_lifecycle_1 = require("./work-permit-lifecycle");
// TDD §13.1/§9 pola job cross-tenant. BR-05 (PRD §6) — "jika [retest]
// terlewati, sistem otomatis mengubah status menjadi SUSPENDED dan
// mengeskalasi notifikasi ke HSE." Status menjadi guard idempotency ALAMI
// (permit SUSPENDED keluar dari filter status='ACTIVE' scan berikutnya,
// sampai WorkPermitService.resumeFromSuspension() mengembalikannya
// ACTIVE dgn retest_due_at baru), TIDAK butuh kolom tracking tambahan.
// PRD §8 baris "Gas retest jatuh tempo dalam 30 menit" (reminder SEBELUM
// overdue, BUKAN transisi status) SENGAJA TIDAK diimplementasikan job ini
// — butuh kolom idempotency tracking terpisah yang belum ada di skema
// literal Modul 06 §5, gap TDD §26 (pola sama keputusan 3.2 mendeprioritaskan
// notifikasi non-BR).
let GasRetestDueScanService = class GasRetestDueScanService {
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
      SELECT DISTINCT wp.tenant_id
      FROM work_permits wp
      JOIN work_permit_types wpt ON wpt.work_permit_type_id = wp.work_permit_type_id
      WHERE wp.status = 'ACTIVE' AND wpt.gas_retest_interval_hours IS NOT NULL
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "gas-retest-due-scan gagal untuk satu tenant", {
                    module: "work-permit",
                    action: "gas-retest-due-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const { suspendedIds, hseManagerIds } = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const permits = await tx.workPermit.findMany({
                where: { status: "ACTIVE", deletedAt: null, workPermitType: { gasRetestIntervalHours: { not: null } } },
                select: { id: true },
            });
            if (permits.length === 0)
                return { suspendedIds: [], hseManagerIds: [] };
            const candidates = [];
            for (const permit of permits) {
                const latestTest = await tx.gasTestResult.findFirst({
                    where: { workPermitId: permit.id },
                    orderBy: { testDatetime: "desc" },
                    select: { retestDueAt: true },
                });
                candidates.push({ workPermitId: permit.id, latestRetestDueAt: latestTest?.retestDueAt ?? null });
            }
            const suspendedIds = (0, work_permit_gas_retest_scan_1.findPermitsOverdueForGasRetest)(candidates, now).map((c) => c.workPermitId);
            if (suspendedIds.length === 0)
                return { suspendedIds: [], hseManagerIds: [] };
            for (const workPermitId of suspendedIds) {
                const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId } });
                (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)(permit.status, "SUSPENDED");
            }
            await tx.workPermit.updateMany({ where: { id: { in: suspendedIds } }, data: { status: "SUSPENDED" } });
            const hseManagers = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
                select: { id: true },
            });
            this.logger.event("info", "gas-retest-due-scan: transisi diproses", {
                module: "work-permit",
                action: "gas-retest-due-scan.processed",
                tenant_id: tenantId,
                suspended_count: suspendedIds.length,
            });
            return { suspendedIds, hseManagerIds: hseManagers.map((m) => m.id) };
        }));
        // PRD §8 "Gas retest terlewat -> HSE Manager -> 'Permit {permit_number}
        // otomatis SUSPENDED — retest gas terlewat'".
        for (const workPermitId of suspendedIds) {
            const permitNumber = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls((tx) => tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId }, select: { permitNumber: true } })));
            for (const recipientUserId of hseManagerIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: "WORK_PERMIT_GAS_RETEST_OVERDUE",
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
exports.GasRetestDueScanService = GasRetestDueScanService;
exports.GasRetestDueScanService = GasRetestDueScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], GasRetestDueScanService);
