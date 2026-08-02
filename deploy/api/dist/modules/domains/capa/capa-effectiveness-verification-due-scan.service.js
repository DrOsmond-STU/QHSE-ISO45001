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
exports.CapaEffectivenessVerificationDueScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const capa_effectiveness_verification_due_scan_1 = require("./capa-effectiveness-verification-due-scan");
/**
 * PRD §8 "Verifikasi efektivitas jatuh tempo | Verifier, HSE Manager".
 * Struktur pola PERSIS CapaRootCauseSlaScanService/LicenseExpiryScanService.
 */
let CapaEffectivenessVerificationDueScanService = class CapaEffectivenessVerificationDueScanService {
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
      SELECT DISTINCT tenant_id FROM capa_effectiveness_verification WHERE result = 'PENDING' AND due_reminder_sent_at IS NULL
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "capa-effectiveness-verification-due-scan gagal untuk satu tenant", {
                    module: "capa",
                    action: "capa-effectiveness-verification-due-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const notifications = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const verifications = await tx.capaEffectivenessVerification.findMany({
                where: { result: "PENDING", dueReminderSentAt: null, deletedAt: null },
                select: {
                    id: true,
                    result: true,
                    verificationDueDate: true,
                    dueReminderSentAt: true,
                    verifiedBy: true,
                    capaRegisterId: true,
                },
            });
            if (verifications.length === 0)
                return [];
            const candidates = verifications.map((v) => ({
                effectivenessVerificationId: v.id,
                result: v.result,
                verificationDueDate: v.verificationDueDate,
                dueReminderSentAt: v.dueReminderSentAt,
            }));
            const due = (0, capa_effectiveness_verification_due_scan_1.findCapaEffectivenessVerificationDue)(candidates, now);
            if (due.length === 0)
                return [];
            await tx.capaEffectivenessVerification.updateMany({
                where: { id: { in: due.map((d) => d.effectivenessVerificationId) } },
                data: { dueReminderSentAt: now },
            });
            this.logger.event("info", "capa-effectiveness-verification-due-scan: reminder diproses", {
                module: "capa",
                action: "capa-effectiveness-verification-due-scan.processed",
                tenant_id: tenantId,
                due_count: due.length,
            });
            const hseManagers = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
                select: { id: true },
            });
            const hseManagerIds = hseManagers.map((m) => m.id);
            const byId = new Map(verifications.map((v) => [v.id, v]));
            const capaIds = [...new Set(due.map((d) => byId.get(d.effectivenessVerificationId).capaRegisterId))];
            const capas = await tx.capaRegister.findMany({ where: { id: { in: capaIds } }, select: { id: true, capaNumber: true } });
            const capaById = new Map(capas.map((c) => [c.id, c]));
            return due.map((d) => {
                const verification = byId.get(d.effectivenessVerificationId);
                const capa = capaById.get(verification.capaRegisterId);
                return {
                    effectivenessVerificationId: verification.id,
                    recipientUserIds: [...new Set([verification.verifiedBy, ...hseManagerIds])],
                    variables: { capaNumber: capa.capaNumber, verificationDueDate: verification.verificationDueDate.toISOString().slice(0, 10) },
                };
            });
        }));
        for (const n of notifications) {
            for (const recipientUserId of n.recipientUserIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: "CAPA_EFFECTIVENESS_VERIFICATION_DUE",
                    entityType: "CAPA_EFFECTIVENESS_VERIFICATION",
                    entityId: n.effectivenessVerificationId,
                    recipientUserId,
                    priority: "MEDIUM",
                    eventCategory: "CAPA",
                    variables: n.variables,
                }));
            }
        }
    }
};
exports.CapaEffectivenessVerificationDueScanService = CapaEffectivenessVerificationDueScanService;
exports.CapaEffectivenessVerificationDueScanService = CapaEffectivenessVerificationDueScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], CapaEffectivenessVerificationDueScanService);
//# sourceMappingURL=capa-effectiveness-verification-due-scan.service.js.map