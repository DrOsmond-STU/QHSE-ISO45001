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
exports.CustomerComplaintService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const quality_context_1 = require("./quality-context");
const complaint_lifecycle_1 = require("./complaint-lifecycle");
const quality_workflow_bootstrap_service_1 = require("./quality-workflow-bootstrap.service");
const COMPLAINT_NUMBERING_MODULE_CODE = "QUALITY_COMPLAINT";
const COMPLAINT_WORKFLOW_ENTITY_TYPE = "customer_complaint";
// PRD §4.2 poin 1 "SLA respons awal (default 2x24 jam, configurable)" —
// TIDAK ADA kolom tenant-config utk override ini di skema §5 literal —
// hardcode 48 jam, gap TDD §26 (pola sama seluruh SLA invented lain).
const DEFAULT_INITIAL_RESPONSE_SLA_HOURS = 48;
/**
 * Task 5.1 (Modul 11 §4.2, §3 "Customer Service/Sales | quality.complaint.create",
 * "Quality Manager | quality.complaint.manage"). BELUM ada controller HTTP.
 */
let CustomerComplaintService = class CustomerComplaintService {
    prisma;
    numberingService;
    bootstrapService;
    workflowEngineService;
    constructor(prisma, numberingService, bootstrapService, workflowEngineService) {
        this.prisma = prisma;
        this.numberingService = numberingService;
        this.bootstrapService = bootstrapService;
        this.workflowEngineService = workflowEngineService;
    }
    async create(input) {
        const receivedBy = (0, quality_context_1.requireActorUserId)();
        const tenantId = (0, quality_context_1.requireTenantId)();
        await this.bootstrapService.ensureComplaintNumberingConfig();
        const complaintNumber = await this.numberingService.generateNext(COMPLAINT_NUMBERING_MODULE_CODE, { variables: {} });
        const initialResponseDueDate = new Date(input.complaintDate.getTime() + DEFAULT_INITIAL_RESPONSE_SLA_HOURS * 60 * 60 * 1000);
        return this.prisma.withRls((tx) => tx.customerComplaint.create({
            data: {
                tenantId,
                companyId: input.companyId,
                siteId: input.siteId,
                complaintNumber,
                customerName: input.customerName,
                customerCode: input.customerCode,
                customerContactPerson: input.customerContactPerson,
                customerContactEmail: input.customerContactEmail,
                customerContactPhone: input.customerContactPhone,
                productCode: input.productCode,
                productName: input.productName,
                batchLotNumber: input.batchLotNumber,
                quantityAffected: input.quantityAffected,
                complaintChannel: input.complaintChannel,
                complaintDate: input.complaintDate,
                receivedBy,
                description: input.description,
                complaintCategory: input.complaintCategory,
                severity: input.severity,
                initialResponseDueDate,
                status: "RECEIVED",
                createdBy: receivedBy,
                updatedBy: receivedBy,
            },
        }));
    }
    async recordInitialResponse(complaintId) {
        const updatedBy = (0, quality_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.customerComplaint.update({ where: { id: complaintId }, data: { initialResponseSentAt: new Date(), updatedBy } }));
    }
    /** RECEIVED->UNDER_INVESTIGATION, opsional tautkan ncr_id (§4.2 poin 2). */
    async startInvestigation(complaintId, investigationSummary, ncrId) {
        const updatedBy = (0, quality_context_1.requireActorUserId)();
        const complaint = await this.prisma.withRls((tx) => tx.customerComplaint.findUniqueOrThrow({ where: { id: complaintId } }));
        (0, complaint_lifecycle_1.validateComplaintStatusTransition)(complaint.status, "UNDER_INVESTIGATION");
        return this.prisma.withRls((tx) => tx.customerComplaint.update({
            where: { id: complaintId },
            data: { status: "UNDER_INVESTIGATION", investigationSummary, ncrId, updatedBy },
        }));
    }
    /** Submit workflow QUALITY_COMPLAINT 3-stage (Investigasi->Review Approval->Konfirmasi Penutupan). */
    async submitForApproval(complaintId) {
        const actorId = (0, quality_context_1.requireActorUserId)();
        const complaint = await this.prisma.withRls((tx) => tx.customerComplaint.findUniqueOrThrow({ where: { id: complaintId } }));
        if (complaint.workflowInstanceId) {
            throw new Error("customer_complaints sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
        }
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureComplaintWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(COMPLAINT_WORKFLOW_ENTITY_TYPE, complaintId, definition.id, {});
        return this.prisma.withRls((tx) => tx.customerComplaint.update({ where: { id: complaintId }, data: { workflowInstanceId: instance.id, updatedBy: actorId } }));
    }
    /**
     * Dipanggil CustomerComplaintWorkflowCompletionListener saat workflow
     * APPROVED — severity HIGH/CRITICAL TANPA capa_id -> CAPA_IN_PROGRESS
     * (BR-01-analog, tunggu linkCapaRegister() manual); selainnya -> RESOLVED
     * langsung (BR-01-analog terpenuhi trivially, tidak butuh CAPA).
     */
    async markInvestigationApproved(complaintId) {
        const complaint = await this.prisma.withRls((tx) => tx.customerComplaint.findUniqueOrThrow({ where: { id: complaintId } }));
        const needsCapa = (complaint.severity === "HIGH" || complaint.severity === "CRITICAL") && !complaint.capaRegisterId;
        const nextStatus = needsCapa ? "CAPA_IN_PROGRESS" : "RESOLVED";
        (0, complaint_lifecycle_1.validateComplaintStatusTransition)(complaint.status, nextStatus);
        return this.prisma.withRls((tx) => tx.customerComplaint.update({ where: { id: complaintId }, data: { status: nextStatus, workflowInstanceId: null } }));
    }
    async returnToInvestigation(complaintId) {
        return this.prisma.withRls((tx) => tx.customerComplaint.update({ where: { id: complaintId }, data: { status: "UNDER_INVESTIGATION", workflowInstanceId: null } }));
    }
    /** BR-01-analog — manual link, pola sama NcrRecordService.linkCapaRegister(). */
    async linkCapaRegister(complaintId, capaRegisterId) {
        const updatedBy = (0, quality_context_1.requireActorUserId)();
        const complaint = await this.prisma.withRls((tx) => tx.customerComplaint.findUniqueOrThrow({ where: { id: complaintId } }));
        (0, complaint_lifecycle_1.assertCapaRequiredForCategory)(complaint.severity, capaRegisterId);
        return this.prisma.withRls((tx) => tx.customerComplaint.update({ where: { id: complaintId }, data: { capaRegisterId, status: "RESOLVED", updatedBy } }));
    }
    async confirmCustomerSatisfaction(complaintId, rootCauseSummary, correctiveActionSummary) {
        const updatedBy = (0, quality_context_1.requireActorUserId)();
        const complaint = await this.prisma.withRls((tx) => tx.customerComplaint.findUniqueOrThrow({ where: { id: complaintId } }));
        (0, complaint_lifecycle_1.validateComplaintStatusTransition)(complaint.status, "CLOSED");
        (0, complaint_lifecycle_1.assertCapaRequiredForCategory)(complaint.severity, complaint.capaRegisterId);
        return this.prisma.withRls((tx) => tx.customerComplaint.update({
            where: { id: complaintId },
            data: {
                status: "CLOSED",
                customerSatisfactionConfirmed: true,
                customerFeedbackDate: new Date(),
                rootCauseSummary,
                correctiveActionSummary,
                closedDate: new Date(),
                closedBy: updatedBy,
                updatedBy,
            },
        }));
    }
    async reject(complaintId) {
        const updatedBy = (0, quality_context_1.requireActorUserId)();
        const complaint = await this.prisma.withRls((tx) => tx.customerComplaint.findUniqueOrThrow({ where: { id: complaintId } }));
        (0, complaint_lifecycle_1.validateComplaintStatusTransition)(complaint.status, "REJECTED_INVALID");
        return this.prisma.withRls((tx) => tx.customerComplaint.update({ where: { id: complaintId }, data: { status: "REJECTED_INVALID", updatedBy } }));
    }
    async getById(complaintId) {
        return this.prisma.withRls((tx) => tx.customerComplaint.findUniqueOrThrow({ where: { id: complaintId } }));
    }
};
exports.CustomerComplaintService = CustomerComplaintService;
exports.CustomerComplaintService = CustomerComplaintService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        quality_workflow_bootstrap_service_1.QualityWorkflowBootstrapService,
        workflow_engine_service_1.WorkflowEngineService])
], CustomerComplaintService);
