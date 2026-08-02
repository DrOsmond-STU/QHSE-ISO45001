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
exports.AuditorCompetencyExpiryScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const auditor_competency_expiry_scan_1 = require("./auditor-competency-expiry-scan");
/**
 * TDD §13.1/§9 pola job cross-tenant (sama persis LicenseExpiryScanService
 * 2.2, versi lebih sederhana — TANPA tier reminder krn auditor_competency_records
 * tidak punya kolom idempotency, lihat banner comment auditor-competency-
 * expiry-scan.ts). PRD §8 "Kompetensi auditor akan kedaluwarsa | Auditor
 * terkait, Tenant Admin" — Auditor terkait = competency_records.user_id
 * sendiri, "Tenant Admin" dibaca literal role TENANT_ADMIN (BEDA dari
 * pemetaan "Tenant Admin/HR" -> TENANT_ADMIN di RBAC, di sini PRD §8
 * SUDAH eksplisit sebut "Tenant Admin" tanpa "/HR", jadi tanpa interpretasi
 * tambahan).
 */
let AuditorCompetencyExpiryScanService = class AuditorCompetencyExpiryScanService {
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
      SELECT DISTINCT tenant_id FROM auditor_competency_records WHERE status = 'ACTIVE'
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "auditor-competency-expiry-scan gagal untuk satu tenant", {
                    module: "audit",
                    action: "auditor-competency-expiry-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const notifications = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const records = await tx.auditorCompetencyRecord.findMany({
                where: { status: "ACTIVE", deletedAt: null },
                select: { id: true, userId: true, standardScope: true, status: true, expiryDate: true },
            });
            if (records.length === 0)
                return [];
            const candidates = records.map((r) => ({
                competencyRecordId: r.id,
                status: r.status,
                expiryDate: r.expiryDate,
            }));
            const expiredIds = new Set((0, auditor_competency_expiry_scan_1.findExpiredCompetencyRecords)(candidates, now).map((c) => c.competencyRecordId));
            const approachingIds = new Set((0, auditor_competency_expiry_scan_1.findCompetencyRecordsApproachingExpiry)(candidates, now).map((c) => c.competencyRecordId));
            if (expiredIds.size > 0) {
                await tx.auditorCompetencyRecord.updateMany({ where: { id: { in: [...expiredIds] } }, data: { status: "EXPIRED" } });
            }
            this.logger.event("info", "auditor-competency-expiry-scan: transisi/reminder diproses", {
                module: "audit",
                action: "auditor-competency-expiry-scan.processed",
                tenant_id: tenantId,
                expired_count: expiredIds.size,
                approaching_count: approachingIds.size,
            });
            if (expiredIds.size === 0 && approachingIds.size === 0)
                return [];
            const tenantAdmins = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "TENANT_ADMIN" } } } },
                select: { id: true },
            });
            const tenantAdminIds = tenantAdmins.map((a) => a.id);
            const byId = new Map(records.map((r) => [r.id, r]));
            const results = [];
            for (const competencyRecordId of expiredIds) {
                const record = byId.get(competencyRecordId);
                results.push({
                    competencyRecordId,
                    recipientUserIds: [...new Set([record.userId, ...tenantAdminIds])],
                    eventType: "AUDITOR_COMPETENCY_EXPIRED",
                    priority: "HIGH",
                    variables: { standardScope: record.standardScope, expiryDate: record.expiryDate?.toISOString().slice(0, 10) ?? "" },
                });
            }
            for (const competencyRecordId of approachingIds) {
                const record = byId.get(competencyRecordId);
                results.push({
                    competencyRecordId,
                    recipientUserIds: [...new Set([record.userId, ...tenantAdminIds])],
                    eventType: "AUDITOR_COMPETENCY_EXPIRING_SOON",
                    priority: "MEDIUM",
                    variables: { standardScope: record.standardScope, expiryDate: record.expiryDate?.toISOString().slice(0, 10) ?? "" },
                });
            }
            return results;
        }));
        for (const n of notifications) {
            for (const recipientUserId of n.recipientUserIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: n.eventType,
                    entityType: "AUDITOR_COMPETENCY_RECORD",
                    entityId: n.competencyRecordId,
                    recipientUserId,
                    priority: n.priority,
                    eventCategory: "AUDIT",
                    variables: n.variables,
                }));
            }
        }
    }
};
exports.AuditorCompetencyExpiryScanService = AuditorCompetencyExpiryScanService;
exports.AuditorCompetencyExpiryScanService = AuditorCompetencyExpiryScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], AuditorCompetencyExpiryScanService);
//# sourceMappingURL=auditor-competency-expiry-scan.service.js.map