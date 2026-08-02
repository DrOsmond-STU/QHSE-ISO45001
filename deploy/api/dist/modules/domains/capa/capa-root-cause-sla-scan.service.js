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
exports.CapaRootCauseSlaScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const capa_root_cause_sla_scan_1 = require("./capa-root-cause-sla-scan");
/**
 * PRD §8 "Root cause belum diisi mendekati SLA | PIC, HSE Manager". CAPA
 * TIDAK py kolom "PIC" tersendiri di capa_register (BEDA dari capa_action_plans.
 * pic_user_id) — disubstitusi capa_register.initiated_by (kandidat paling
 * plausible, orang yang membuat CAPA), pola sama AuditFindingClosureDueScanService
 * (4.1) mensubstitusi "PIC CAPA" dgn lead_auditor_id saat CAPA belum ada.
 * Struktur pola PERSIS LicenseExpiryScanService (2.2): idempotency
 * updateMany DI DALAM transaksi withRls, enqueue() loop DI LUAR (notification
 * service buka transaksinya sendiri — hindari nested $transaction, lihat
 * memory).
 */
let CapaRootCauseSlaScanService = class CapaRootCauseSlaScanService {
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
      SELECT DISTINCT tenant_id FROM capa_register WHERE status = 'DRAFT' AND root_cause_sla_reminder_sent_at IS NULL
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "capa-root-cause-sla-scan gagal untuk satu tenant", {
                    module: "capa",
                    action: "capa-root-cause-sla-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const notifications = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const capas = await tx.capaRegister.findMany({
                where: { status: "DRAFT", rootCauseSlaReminderSentAt: null, deletedAt: null },
                select: { id: true, capaNumber: true, status: true, initiatedAt: true, initiatedBy: true, rootCauseSlaReminderSentAt: true },
            });
            if (capas.length === 0)
                return [];
            const candidates = capas.map((c) => ({
                capaRegisterId: c.id,
                status: c.status,
                initiatedAt: c.initiatedAt,
                rootCauseSlaReminderSentAt: c.rootCauseSlaReminderSentAt,
            }));
            const due = (0, capa_root_cause_sla_scan_1.findCapaRootCauseSlaDue)(candidates, now);
            if (due.length === 0)
                return [];
            await tx.capaRegister.updateMany({
                where: { id: { in: due.map((d) => d.capaRegisterId) } },
                data: { rootCauseSlaReminderSentAt: now },
            });
            this.logger.event("info", "capa-root-cause-sla-scan: reminder diproses", {
                module: "capa",
                action: "capa-root-cause-sla-scan.processed",
                tenant_id: tenantId,
                due_count: due.length,
            });
            const hseManagers = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
                select: { id: true },
            });
            const hseManagerIds = hseManagers.map((m) => m.id);
            const byId = new Map(capas.map((c) => [c.id, c]));
            return due.map((d) => {
                const capa = byId.get(d.capaRegisterId);
                return {
                    capaRegisterId: capa.id,
                    recipientUserIds: [...new Set([capa.initiatedBy, ...hseManagerIds])],
                    variables: { capaNumber: capa.capaNumber },
                };
            });
        }));
        for (const n of notifications) {
            for (const recipientUserId of n.recipientUserIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: "CAPA_ROOT_CAUSE_SLA_DUE",
                    entityType: "CAPA_REGISTER",
                    entityId: n.capaRegisterId,
                    recipientUserId,
                    priority: "MEDIUM",
                    eventCategory: "CAPA",
                    variables: n.variables,
                }));
            }
        }
    }
};
exports.CapaRootCauseSlaScanService = CapaRootCauseSlaScanService;
exports.CapaRootCauseSlaScanService = CapaRootCauseSlaScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], CapaRootCauseSlaScanService);
//# sourceMappingURL=capa-root-cause-sla-scan.service.js.map