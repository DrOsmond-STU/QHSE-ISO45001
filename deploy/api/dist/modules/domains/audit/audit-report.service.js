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
exports.AuditReportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const audit_context_1 = require("./audit-context");
const audit_workflow_bootstrap_service_1 = require("./audit-workflow-bootstrap.service");
const audit_service_1 = require("./audit.service");
// Lihat banner comment AuditWorkflowBootstrapService.ensureAuditReportWorkflowDefinition.
const AUDIT_REPORT_WORKFLOW_ENTITY_TYPE = "audit_report";
/**
 * Task 4.1 (Modul 09 §4 poin 7, §3 "Lead Auditor | audit.report.generate").
 * BELUM ada controller HTTP. Stage 1 workflow ("Review Lead Auditor")
 * CONTEXT_USER — contextData.contextUserId diisi dari audits.lead_auditor_id
 * SAAT submitForApproval() (bukan dari user yang submit), pola PERSIS
 * DocumentVersionService (2.1). audits.workflow_instance_id (kolom
 * denormalized, lihat banner comment Audit.workflowInstanceId di
 * schema.prisma) DITULIS BERSAMAAN dgn audit_reports.workflow_instance_id
 * di method yang SAMA supaya TIDAK PERNAH divergen.
 */
let AuditReportService = class AuditReportService {
    prisma;
    bootstrapService;
    workflowEngineService;
    auditService;
    constructor(prisma, bootstrapService, workflowEngineService, auditService) {
        this.prisma = prisma;
        this.bootstrapService = bootstrapService;
        this.workflowEngineService = workflowEngineService;
        this.auditService = auditService;
    }
    async create(auditId) {
        const preparedBy = (0, audit_context_1.requireActorUserId)();
        const tenantId = (0, audit_context_1.requireTenantId)();
        const existing = await this.prisma.withRls((tx) => tx.auditReport.findUnique({ where: { auditId } }));
        if (existing) {
            throw new Error("audit_reports untuk audit ini sudah ada (audit_id UNIQUE).");
        }
        const findings = await this.prisma.withRls((tx) => tx.auditFinding.findMany({ where: { auditId, deletedAt: null } }));
        const totalMajorNc = findings.filter((f) => f.classification === "MAJOR_NC").length;
        const totalMinorNc = findings.filter((f) => f.classification === "MINOR_NC").length;
        const totalObservation = findings.filter((f) => f.classification === "OBSERVATION").length;
        const totalOfi = findings.filter((f) => f.classification === "OFI").length;
        const report = await this.prisma.withRls((tx) => tx.auditReport.create({
            data: {
                tenantId,
                auditId,
                totalMajorNc,
                totalMinorNc,
                totalObservation,
                totalOfi,
                preparedBy,
                preparedAt: new Date(),
                createdBy: preparedBy,
                updatedBy: preparedBy,
            },
        }));
        await this.auditService.markReportDrafted(auditId);
        return report;
    }
    async updateContent(auditReportId, input) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.auditReport.update({
            where: { id: auditReportId },
            data: {
                executiveSummary: input.executiveSummary,
                scopeDescription: input.scopeDescription,
                methodologyDescription: input.methodologyDescription,
                conclusion: input.conclusion,
                updatedBy,
            },
        }));
    }
    async submitForApproval(auditReportId) {
        const actorId = (0, audit_context_1.requireActorUserId)();
        const report = await this.prisma.withRls((tx) => tx.auditReport.findUniqueOrThrow({ where: { id: auditReportId } }));
        if (report.workflowInstanceId) {
            throw new Error("audit_reports sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
        }
        const audit = await this.prisma.withRls((tx) => tx.audit.findUniqueOrThrow({ where: { id: report.auditId } }));
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureAuditReportWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(AUDIT_REPORT_WORKFLOW_ENTITY_TYPE, auditReportId, definition.id, {
            contextUserId: audit.leadAuditorId,
        });
        await this.prisma.withRls((tx) => tx.audit.update({ where: { id: audit.id }, data: { workflowInstanceId: instance.id, updatedBy: actorId } }));
        return this.prisma.withRls((tx) => tx.auditReport.update({ where: { id: auditReportId }, data: { workflowInstanceId: instance.id, updatedBy: actorId } }));
    }
    /**
     * Dipanggil AuditReportWorkflowCompletionListener saat workflow APPROVED
     * — approvedAt terisi, approvedBy SELALU NULL (WorkflowInstanceCompletedEvent
     * tidak punya field actor, pola sama seluruh listener modul lain), lalu
     * memicu AuditService.markReportApproved() (audits.status->REPORT_APPROVED/
     * PENDING_CAPA_CLOSURE).
     */
    async markApproved(auditReportId) {
        const report = await this.prisma.withRls((tx) => tx.auditReport.update({ where: { id: auditReportId }, data: { approvedAt: new Date() } }));
        await this.auditService.markReportApproved(report.auditId);
        return report;
    }
    /**
     * Dipanggil listener saat workflow REJECTED — workflow_instance_id
     * di-null-kan (audit_reports DAN audits, keduanya kolom denormalized yang
     * sama) utk resubmission. audits.status TETAP REPORT_DRAFTED (sudah benar
     * labelnya, tidak perlu transisi apa pun).
     */
    async returnToDraft(auditReportId) {
        const report = await this.prisma.withRls((tx) => tx.auditReport.update({ where: { id: auditReportId }, data: { workflowInstanceId: null } }));
        await this.prisma.withRls((tx) => tx.audit.update({ where: { id: report.auditId }, data: { workflowInstanceId: null } }));
        return report;
    }
    // PRD §11 "wajib dapat digenerate & disimpan sbg dokumen terkontrol" —
    // linkage MANUAL, TIDAK ADA auto-create dokumen DMS (lihat banner comment
    // AuditReport.documentId di schema.prisma).
    async linkDocument(auditReportId, documentId) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.auditReport.update({ where: { id: auditReportId }, data: { documentId, updatedBy } }));
    }
    async getById(auditReportId) {
        return this.prisma.withRls((tx) => tx.auditReport.findUniqueOrThrow({ where: { id: auditReportId } }));
    }
    async getByAuditId(auditId) {
        return this.prisma.withRls((tx) => tx.auditReport.findUnique({ where: { auditId } }));
    }
};
exports.AuditReportService = AuditReportService;
exports.AuditReportService = AuditReportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_workflow_bootstrap_service_1.AuditWorkflowBootstrapService,
        workflow_engine_service_1.WorkflowEngineService,
        audit_service_1.AuditService])
], AuditReportService);
//# sourceMappingURL=audit-report.service.js.map