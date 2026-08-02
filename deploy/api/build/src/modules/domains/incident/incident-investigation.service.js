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
exports.IncidentInvestigationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const incident_context_1 = require("./incident-context");
const incident_lifecycle_1 = require("./incident-lifecycle");
const incident_regulatory_report_rules_1 = require("./incident-regulatory-report-rules");
const incident_workflow_bootstrap_service_1 = require("./incident-workflow-bootstrap.service");
const INCIDENT_INVESTIGATION_WORKFLOW_ENTITY_TYPE = "incident_investigation";
const DEFAULT_REGULATORY_REPORT_TYPE = "Laporan Kecelakaan Kerja Tahap 1";
// Task 3.5 (Modul 07 §4 poin 4-7). TIDAK ADA wrapper BR-09-style di atas
// actOnTask() (BEDA dari WorkPermitService.actOnApprovalTask(), 3.3) — PRD
// Modul 07 §6 TIDAK punya BR segregation-of-duty utk investigasi; kedua
// stage sama-sama HSE_MANAGER (bukan requester-vs-approver), jadi caller
// panggil WorkflowEngineService.actOnTask() LANGSUNG, pola sama HIRA/JSA/
// HIRADC/DMS/Compliance.
let IncidentInvestigationService = class IncidentInvestigationService {
    prisma;
    workflowEngineService;
    bootstrapService;
    constructor(prisma, workflowEngineService, bootstrapService) {
        this.prisma = prisma;
        this.workflowEngineService = workflowEngineService;
        this.bootstrapService = bootstrapService;
    }
    /** PRD §4 poin 4 "wajib utk FATALITY/LTI/PSE/RESTRICTED_WORK_CASE;
     * opsional/sampling lainnya" — TIDAK ditegakkan sbg guard DI SINI (siapa
     * pun dgn permission boleh membuat investigasi utk klasifikasi apa pun,
     * termasuk NEAR_MISS "sampling") — hanya BR-01 (gate CLOSED) yang
     * genuinely menegakkan kewajiban utk 3 klasifikasi spesifik. */
    async create(input) {
        const createdBy = (0, incident_context_1.requireActorUserId)();
        const tenantId = (0, incident_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const report = await tx.incidentReport.findUniqueOrThrow({ where: { id: input.incidentReportId } });
            (0, incident_lifecycle_1.validateIncidentReportStatusTransition)(report.status, "UNDER_INVESTIGATION");
            const investigation = await tx.incidentInvestigation.create({
                data: {
                    tenantId,
                    incidentReportId: input.incidentReportId,
                    method: input.method,
                    methodOtherDetail: input.methodOtherDetail,
                    leadInvestigatorId: input.leadInvestigatorId,
                    startedAt: input.startedAt,
                    targetCompletionAt: input.targetCompletionAt,
                    status: "IN_PROGRESS",
                    createdBy,
                    updatedBy: createdBy,
                },
            });
            await tx.incidentReport.update({ where: { id: input.incidentReportId }, data: { status: "UNDER_INVESTIGATION", updatedBy: createdBy } });
            return investigation;
        });
    }
    async assignTeam(incidentInvestigationId, userId, roleInTeam) {
        const createdBy = (0, incident_context_1.requireActorUserId)();
        const tenantId = (0, incident_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.incidentInvestigationTeam.create({
            data: { tenantId, incidentInvestigationId, userId, roleInTeam, createdBy, updatedBy: createdBy },
        }));
    }
    async recordRootCause(incidentInvestigationId, input) {
        const createdBy = (0, incident_context_1.requireActorUserId)();
        const tenantId = (0, incident_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.incidentRootCause.create({
            data: {
                tenantId,
                incidentInvestigationId,
                causeType: input.causeType,
                category: input.category,
                description: input.description,
                methodReference: input.methodReference,
                sequenceNo: input.sequenceNo,
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    /**
     * PRD §4 poin 7-8 — Review & Approval via Workflow Engine
     * (entity_type=incident_investigation), diikuti (BR-03) pembuatan
     * incident_regulatory_reports otomatis kalau classification permit induk
     * masuk kategori wajib lapor. Auto-create regulatory report DI SINI (SAAT
     * submit, BUKAN setelah approval — lihat banner comment
     * IncidentWorkflowBootstrapService.ensureWorkflowDefinition()) supaya
     * Stage 2 workflow ini SENDIRI (kondisional hasRegulatoryReport) punya
     * data yang genuinely sudah ada saat kondisi dievaluasi — interpretasi
     * urutan §4 poin 7 vs 8 didokumentasikan TDD §26. EMPAT transaksi
     * terpisah, pola PERSIS WorkPermitExtensionService.request() (3.4).
     */
    async submitForApproval(incidentInvestigationId) {
        const actorId = (0, incident_context_1.requireActorUserId)();
        const tenantId = (0, incident_context_1.requireTenantId)();
        const hasRegulatoryReport = await this.prisma.withRls(async (tx) => {
            const investigation = await tx.incidentInvestigation.findUniqueOrThrow({ where: { id: incidentInvestigationId } });
            if (investigation.status !== "IN_PROGRESS") {
                throw new common_1.BadRequestException(`incident_investigations berstatus ${investigation.status} tidak dapat diajukan (wajib IN_PROGRESS).`);
            }
            const report = await tx.incidentReport.findUniqueOrThrow({ where: { id: investigation.incidentReportId } });
            let regulatoryReport = await tx.incidentRegulatoryReport.findFirst({ where: { incidentReportId: report.id } });
            if (!regulatoryReport && (0, incident_regulatory_report_rules_1.shouldAutoCreateRegulatoryReport)(report.classification)) {
                regulatoryReport = await tx.incidentRegulatoryReport.create({
                    data: {
                        tenantId,
                        incidentReportId: report.id,
                        regulatoryBody: "KEMNAKER",
                        reportType: DEFAULT_REGULATORY_REPORT_TYPE,
                        requiredByDate: (0, incident_regulatory_report_rules_1.computeRequiredByDate)(report.incidentDatetime),
                        status: "PENDING",
                        createdBy: actorId,
                        updatedBy: actorId,
                    },
                });
            }
            return regulatoryReport !== null;
        });
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(INCIDENT_INVESTIGATION_WORKFLOW_ENTITY_TYPE, incidentInvestigationId, definition.id, {
            hasRegulatoryReport,
        });
        return this.prisma.withRls((tx) => tx.incidentInvestigation.update({
            where: { id: incidentInvestigationId },
            data: { status: "PENDING_REVIEW", workflowInstanceId: instance.id, updatedBy: actorId },
        }));
    }
    async getById(incidentInvestigationId) {
        return this.prisma.withRls((tx) => tx.incidentInvestigation.findUniqueOrThrow({
            where: { id: incidentInvestigationId },
            include: { team: true, rootCauses: true },
        }));
    }
};
exports.IncidentInvestigationService = IncidentInvestigationService;
exports.IncidentInvestigationService = IncidentInvestigationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        workflow_engine_service_1.WorkflowEngineService,
        incident_workflow_bootstrap_service_1.IncidentWorkflowBootstrapService])
], IncidentInvestigationService);
