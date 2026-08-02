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
exports.AuditFindingClosureDueScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const audit_finding_closure_due_scan_1 = require("./audit-finding-closure-due-scan");
/**
 * TDD §13.1/§9 pola job cross-tenant. PRD §8 "Tenggat closure NC mendekat |
 * PIC CAPA terkait, Audit Program Owner" — Modul 10 (CAPA, task 4.2) BELUM
 * ADA, jadi TIDAK ADA "PIC CAPA" genuinely tersimpan di mana pun (gap TDD
 * §26) — disubstitusi audits.lead_auditor_id (kandidat paling plausible
 * yang TAHU status temuan sebelum CAPA formal ada) + HSE_MANAGER tenant-wide
 * (Audit Program Owner stand-in, pola sama seluruh modul lain).
 */
let AuditFindingClosureDueScanService = class AuditFindingClosureDueScanService {
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
      SELECT DISTINCT tenant_id FROM audit_findings WHERE status != 'CLOSED' AND target_closure_date IS NOT NULL
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "audit-finding-closure-due-scan gagal untuk satu tenant", {
                    module: "audit",
                    action: "audit-finding-closure-due-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const notifications = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const findings = await tx.auditFinding.findMany({
                where: { status: { not: "CLOSED" }, targetClosureDate: { not: null }, deletedAt: null },
                select: { id: true, findingNumber: true, status: true, targetClosureDate: true, auditId: true },
            });
            if (findings.length === 0)
                return [];
            const candidates = findings.map((f) => ({
                auditFindingId: f.id,
                status: f.status,
                targetClosureDate: f.targetClosureDate,
            }));
            const dueIds = new Set((0, audit_finding_closure_due_scan_1.findFindingsClosureDue)(candidates, now).map((c) => c.auditFindingId));
            if (dueIds.size === 0)
                return [];
            this.logger.event("info", "audit-finding-closure-due-scan: reminder diproses", {
                module: "audit",
                action: "audit-finding-closure-due-scan.processed",
                tenant_id: tenantId,
                due_count: dueIds.size,
            });
            const hseManagers = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
                select: { id: true },
            });
            const hseManagerIds = hseManagers.map((m) => m.id);
            const byId = new Map(findings.map((f) => [f.id, f]));
            const auditIds = [...new Set([...dueIds].map((id) => byId.get(id).auditId))];
            const audits = await tx.audit.findMany({ where: { id: { in: auditIds } }, select: { id: true, leadAuditorId: true, auditNumber: true } });
            const auditById = new Map(audits.map((a) => [a.id, a]));
            return [...dueIds].map((auditFindingId) => {
                const finding = byId.get(auditFindingId);
                const audit = auditById.get(finding.auditId);
                return {
                    auditFindingId,
                    recipientUserIds: [...new Set([audit.leadAuditorId, ...hseManagerIds])],
                    variables: {
                        findingNumber: finding.findingNumber,
                        auditNumber: audit.auditNumber,
                        targetClosureDate: finding.targetClosureDate?.toISOString().slice(0, 10) ?? "",
                    },
                };
            });
        }));
        for (const n of notifications) {
            for (const recipientUserId of n.recipientUserIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: "AUDIT_FINDING_CLOSURE_DUE",
                    entityType: "AUDIT_FINDING",
                    entityId: n.auditFindingId,
                    recipientUserId,
                    priority: "HIGH",
                    eventCategory: "AUDIT",
                    variables: n.variables,
                }));
            }
        }
    }
};
exports.AuditFindingClosureDueScanService = AuditFindingClosureDueScanService;
exports.AuditFindingClosureDueScanService = AuditFindingClosureDueScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], AuditFindingClosureDueScanService);
