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
exports.IncidentRegulatoryReportOverdueScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const incident_regulatory_report_overdue_scan_1 = require("./incident-regulatory-report-overdue-scan");
// TDD §13.1/§9 pola job cross-tenant (sama persis WorkPermitExpiryScanService,
// 3.4). BR-09 (PRD §6, tidak langsung — status OVERDUE adalah prasyarat gate
// CLOSED) — status menjadi guard idempotency alami (baris OVERDUE keluar
// dari filter status='PENDING' scan berikutnya sampai disubmit()).
let IncidentRegulatoryReportOverdueScanService = class IncidentRegulatoryReportOverdueScanService {
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
      SELECT DISTINCT tenant_id FROM incident_regulatory_reports WHERE status = 'PENDING'
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "incident-regulatory-report-overdue-scan gagal untuk satu tenant", {
                    module: "incident",
                    action: "incident-regulatory-report-overdue-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const { overdueIds, hseManagerIds } = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const reports = await tx.incidentRegulatoryReport.findMany({
                where: { status: "PENDING", deletedAt: null },
                select: { id: true, requiredByDate: true },
            });
            if (reports.length === 0)
                return { overdueIds: [], hseManagerIds: [] };
            const candidates = reports.map((r) => ({
                incidentRegulatoryReportId: r.id,
                requiredByDate: r.requiredByDate,
            }));
            const overdueIds = (0, incident_regulatory_report_overdue_scan_1.findOverdueRegulatoryReports)(candidates, now).map((c) => c.incidentRegulatoryReportId);
            if (overdueIds.length === 0)
                return { overdueIds: [], hseManagerIds: [] };
            await tx.incidentRegulatoryReport.updateMany({ where: { id: { in: overdueIds } }, data: { status: "OVERDUE" } });
            const hseManagers = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
                select: { id: true },
            });
            this.logger.event("info", "incident-regulatory-report-overdue-scan: transisi diproses", {
                module: "incident",
                action: "incident-regulatory-report-overdue-scan.processed",
                tenant_id: tenantId,
                overdue_count: overdueIds.length,
            });
            return { overdueIds, hseManagerIds: hseManagers.map((m) => m.id) };
        }));
        for (const incidentRegulatoryReportId of overdueIds) {
            const report = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls((tx) => tx.incidentRegulatoryReport.findUniqueOrThrow({
                where: { id: incidentRegulatoryReportId },
                select: { incidentReport: { select: { incidentNumber: true } } },
            })));
            for (const recipientUserId of hseManagerIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: "INCIDENT_REGULATORY_REPORT_OVERDUE",
                    entityType: "INCIDENT_REGULATORY_REPORT",
                    entityId: incidentRegulatoryReportId,
                    recipientUserId,
                    priority: "HIGH",
                    eventCategory: "INCIDENT",
                    variables: { incidentNumber: report.incidentReport.incidentNumber },
                }));
            }
        }
    }
};
exports.IncidentRegulatoryReportOverdueScanService = IncidentRegulatoryReportOverdueScanService;
exports.IncidentRegulatoryReportOverdueScanService = IncidentRegulatoryReportOverdueScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], IncidentRegulatoryReportOverdueScanService);
