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
exports.InspectionFindingSlaScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const inspection_finding_sla_scan_1 = require("./inspection-finding-sla-scan");
/**
 * TDD §13.1/§9 pola job cross-tenant. BR-04 — "temuan severity=HIGH wajib
 * memiliki action_tracking_id terisi dalam SLA 24 jam sejak identified_at,
 * ATAU sistem mengeskalasi notifikasi ke HSE Manager." BEDA dari 2 scan
 * lain modul ini — TIDAK ADA transisi status di sini (inspection_findings.status
 * TETAP OPEN/apa pun adanya), BR-04 murni eskalasi NOTIFIKASI. Konsekuensi:
 * TIDAK ADA kolom idempotency tracking (pola sama gap H-30-menit gas
 * retest Work Permit 3.4) — finding yang SAMA akan terus dinotifikasi
 * ULANG SETIAP SCAN sampai action_tracking_id terisi atau status=CLOSED,
 * dibaca sbg "nag harian" yang genuinely masuk akal utk severity HIGH yang
 * belum ditindaklanjuti (bukan bug, tapi beda dari precedent scan lain,
 * gap didokumentasikan TDD §26).
 */
let InspectionFindingSlaScanService = class InspectionFindingSlaScanService {
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
      SELECT DISTINCT tenant_id FROM inspection_findings
      WHERE severity = 'HIGH' AND action_tracking_id IS NULL AND status != 'CLOSED'
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "inspection-finding-sla-scan gagal untuk satu tenant", {
                    module: "inspection",
                    action: "inspection-finding-sla-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const { needingEscalationIds, hseManagerIds } = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const findings = await tx.inspectionFinding.findMany({
                where: { severity: "HIGH", actionTrackingId: null, status: { not: "CLOSED" }, deletedAt: null },
                select: { id: true, identifiedAt: true },
            });
            if (findings.length === 0)
                return { needingEscalationIds: [], hseManagerIds: [] };
            const candidates = findings.map((f) => ({ findingId: f.id, identifiedAt: f.identifiedAt }));
            const needingEscalationIds = (0, inspection_finding_sla_scan_1.findHighSeverityFindingsNeedingEscalation)(candidates, now).map((c) => c.findingId);
            if (needingEscalationIds.length === 0)
                return { needingEscalationIds: [], hseManagerIds: [] };
            const hseManagers = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
                select: { id: true },
            });
            this.logger.event("info", "inspection-finding-sla-scan: eskalasi diproses", {
                module: "inspection",
                action: "inspection-finding-sla-scan.processed",
                tenant_id: tenantId,
                escalated_count: needingEscalationIds.length,
            });
            return { needingEscalationIds, hseManagerIds: hseManagers.map((m) => m.id) };
        }));
        for (const findingId of needingEscalationIds) {
            const finding = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls((tx) => tx.inspectionFinding.findUniqueOrThrow({ where: { id: findingId }, select: { title: true } })));
            for (const recipientUserId of hseManagerIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: "INSPECTION_FINDING_SLA_BREACH",
                    entityType: "INSPECTION_FINDING",
                    entityId: findingId,
                    recipientUserId,
                    priority: "HIGH",
                    eventCategory: "INSPECTION",
                    variables: { title: finding.title },
                }));
            }
        }
    }
};
exports.InspectionFindingSlaScanService = InspectionFindingSlaScanService;
exports.InspectionFindingSlaScanService = InspectionFindingSlaScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], InspectionFindingSlaScanService);
