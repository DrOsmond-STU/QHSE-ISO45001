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
var AuditReportWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditReportWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const audit_report_service_1 = require("./audit-report.service");
// Lihat banner comment AuditWorkflowBootstrapService.ensureAuditReportWorkflowDefinition.
const AUDIT_REPORT_WORKFLOW_ENTITY_TYPE = "audit_report";
/**
 * Task 4.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * audit_report (pola PERSIS AuditProgramWorkflowCompletionListener/listener
 * modul lain — payload-only, TIDAK PERNAH re-query workflow_instances/
 * workflow_tasks). APPROVED -> AuditReportService.markApproved(). REJECTED
 * -> returnToDraft().
 *
 * TIDAK enqueue notifikasi di sini — PRD §8 baris "Laporan audit menunggu
 * approval" hanya utk SAAT SUBMIT (sama alasan AuditProgramWorkflowCompletionListener),
 * TIDAK ADA baris §8 "laporan disetujui/ditolak", gap TDD §26.
 */
let AuditReportWorkflowCompletionListener = AuditReportWorkflowCompletionListener_1 = class AuditReportWorkflowCompletionListener {
    reportService;
    logger = new common_1.Logger(AuditReportWorkflowCompletionListener_1.name);
    constructor(reportService) {
        this.reportService = reportService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== AUDIT_REPORT_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED") {
                    await this.reportService.markApproved(payload.entityId);
                }
                else if (payload.status === "REJECTED") {
                    await this.reportService.returnToDraft(payload.entityId);
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk audit_report=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
};
exports.AuditReportWorkflowCompletionListener = AuditReportWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditReportWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.AuditReportWorkflowCompletionListener = AuditReportWorkflowCompletionListener = AuditReportWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_report_service_1.AuditReportService])
], AuditReportWorkflowCompletionListener);
