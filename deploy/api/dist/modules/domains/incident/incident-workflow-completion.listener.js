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
var IncidentWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const incident_lifecycle_1 = require("./incident-lifecycle");
const INCIDENT_INVESTIGATION_WORKFLOW_ENTITY_TYPE = "incident_investigation";
/**
 * Task 3.5 — KEDELAPAN KONSUMEN WORKFLOW_INSTANCE_COMPLETED_EVENT (pola
 * PERSIS listener lain modul ini/3.4/3.3/3.2/2.1/2.2 — payload-only, TIDAK
 * PERNAH re-query workflow_instances/workflow_tasks). APPROVED ->
 * incident_investigations.status=APPROVED, incident_reports.status
 * UNDER_INVESTIGATION->INVESTIGATION_COMPLETED, LALU (SATU transaksi yang
 * sama) ->PENDING_REGULATORY_REPORT kalau ADA baris incident_regulatory_reports
 * utk permit ini (BR-03 sudah membuatnya saat submitForApproval()).
 * REJECTED -> incident_investigations.status=RETURNED (BUKAN "REJECTED" —
 * enum IncidentInvestigationStatus tidak py nilai itu), incident_reports.status
 * TETAP UNDER_INVESTIGATION (HSE Officer merevisi/membuat investigasi baru).
 */
let IncidentWorkflowCompletionListener = IncidentWorkflowCompletionListener_1 = class IncidentWorkflowCompletionListener {
    prisma;
    notificationService;
    logger = new common_1.Logger(IncidentWorkflowCompletionListener_1.name);
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== INCIDENT_INVESTIGATION_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED") {
                    await this.markApproved(payload.entityId);
                }
                else if (payload.status === "REJECTED") {
                    await this.markReturned(payload.entityId);
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk incident_investigation=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
    async markApproved(investigationId) {
        const { incidentNumber, requestedBy } = await this.prisma.withRls(async (tx) => {
            const investigation = await tx.incidentInvestigation.update({ where: { id: investigationId }, data: { status: "APPROVED" } });
            const report = await tx.incidentReport.findUniqueOrThrow({ where: { id: investigation.incidentReportId } });
            (0, incident_lifecycle_1.validateIncidentReportStatusTransition)(report.status, "INVESTIGATION_COMPLETED");
            let updatedReport = await tx.incidentReport.update({ where: { id: report.id }, data: { status: "INVESTIGATION_COMPLETED" } });
            const hasRegulatoryReport = (await tx.incidentRegulatoryReport.count({ where: { incidentReportId: report.id } })) > 0;
            if (hasRegulatoryReport) {
                (0, incident_lifecycle_1.validateIncidentReportStatusTransition)(updatedReport.status, "PENDING_REGULATORY_REPORT");
                updatedReport = await tx.incidentReport.update({ where: { id: report.id }, data: { status: "PENDING_REGULATORY_REPORT" } });
            }
            return { incidentNumber: updatedReport.incidentNumber, requestedBy: investigation.leadInvestigatorId };
        });
        await this.notificationService.enqueue({
            eventType: "INCIDENT_INVESTIGATION_APPROVED",
            entityType: "INCIDENT_INVESTIGATION",
            entityId: investigationId,
            recipientUserId: requestedBy,
            priority: "MEDIUM",
            eventCategory: "INCIDENT",
            variables: { incidentNumber },
        });
    }
    async markReturned(investigationId) {
        const { incidentNumber, requestedBy } = await this.prisma.withRls(async (tx) => {
            const investigation = await tx.incidentInvestigation.update({ where: { id: investigationId }, data: { status: "RETURNED" } });
            const report = await tx.incidentReport.findUniqueOrThrow({ where: { id: investigation.incidentReportId } });
            return { incidentNumber: report.incidentNumber, requestedBy: investigation.leadInvestigatorId };
        });
        await this.notificationService.enqueue({
            eventType: "INCIDENT_INVESTIGATION_RETURNED",
            entityType: "INCIDENT_INVESTIGATION",
            entityId: investigationId,
            recipientUserId: requestedBy,
            priority: "MEDIUM",
            eventCategory: "INCIDENT",
            variables: { incidentNumber },
        });
    }
};
exports.IncidentWorkflowCompletionListener = IncidentWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IncidentWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.IncidentWorkflowCompletionListener = IncidentWorkflowCompletionListener = IncidentWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], IncidentWorkflowCompletionListener);
//# sourceMappingURL=incident-workflow-completion.listener.js.map