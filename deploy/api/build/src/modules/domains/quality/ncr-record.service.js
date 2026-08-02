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
exports.NcrRecordService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const quality_context_1 = require("./quality-context");
const ncr_lifecycle_1 = require("./ncr-lifecycle");
const quality_workflow_bootstrap_service_1 = require("./quality-workflow-bootstrap.service");
const NCR_NUMBERING_MODULE_CODE = "QUALITY_NCR";
// entity_type=ncr_record, entityId=ncr_records.id (satu baris = satu siklus
// disposisi, beda dari CAPA action_plan yang menunjuk baris induk).
const NCR_WORKFLOW_ENTITY_TYPE = "ncr_record";
/**
 * Task 5.1 (Modul 11 §4.1, §3 "QC Inspector/Worker | quality.ncr.create",
 * "Quality Manager | quality.ncr.approve_disposition"). BELUM ada
 * controller HTTP. CAPA-linkage (BR-01) TETAP MANUAL (bukan auto-trigger) —
 * TASK_INSTRUCTION.md acceptance 5.1 berbunyi "NCR DAPAT memicu CAPA"
 * (frasa lebih lunak dari Modul 09 §4 "CAPA dibuat OTOMATIS"), pola sama
 * Incident 3.5's `IncidentCorrectiveActionLinkService.link()` — caller
 * wajib `CapaRegisterService.create({sourceType:"QUALITY_NCR",...})`
 * SENDIRI dulu baru `linkCapaRegister()`, gap TDD §26.
 */
let NcrRecordService = class NcrRecordService {
    prisma;
    numberingService;
    bootstrapService;
    workflowEngineService;
    notificationService;
    constructor(prisma, numberingService, bootstrapService, workflowEngineService, notificationService) {
        this.prisma = prisma;
        this.numberingService = numberingService;
        this.bootstrapService = bootstrapService;
        this.workflowEngineService = workflowEngineService;
        this.notificationService = notificationService;
    }
    async create(input) {
        const detectedBy = (0, quality_context_1.requireActorUserId)();
        const tenantId = (0, quality_context_1.requireTenantId)();
        await this.bootstrapService.ensureNcrNumberingConfig(input.siteId);
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true, companyId: true } }));
        const ncrNumber = await this.numberingService.generateNext(NCR_NUMBERING_MODULE_CODE, {
            scopeId: input.siteId,
            variables: { SITE_CODE: site.siteCode },
        });
        const ncr = await this.prisma.withRls((tx) => tx.ncrRecord.create({
            data: {
                tenantId,
                companyId: site.companyId,
                siteId: input.siteId,
                departmentId: input.departmentId,
                ncrNumber,
                ncrSource: input.ncrSource,
                productCode: input.productCode,
                productName: input.productName,
                batchLotNumber: input.batchLotNumber,
                processArea: input.processArea,
                title: input.title,
                description: input.description,
                detectedDate: input.detectedDate,
                detectedBy,
                detectionStage: input.detectionStage,
                severity: input.severity,
                defectCategory: input.defectCategory,
                quantityNonconforming: input.quantityNonconforming,
                unitOfMeasure: input.unitOfMeasure,
                customerComplaintId: input.customerComplaintId,
                supplierCode: input.supplierCode,
                supplierName: input.supplierName,
                status: "OPEN",
                createdBy: detectedBy,
                updatedBy: detectedBy,
            },
        }));
        // PRD §8 "NCR baru severity=CRITICAL | Quality Manager, HSE Manager".
        if (input.severity === "CRITICAL") {
            const recipients = await this.prisma.withRls((tx) => tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: { in: ["QUALITY_MANAGER", "HSE_MANAGER"] } } } } },
                select: { id: true },
            }));
            for (const recipient of recipients) {
                await this.notificationService.enqueue({
                    eventType: "QUALITY_NCR_CRITICAL",
                    entityType: "NCR_RECORD",
                    entityId: ncr.id,
                    recipientUserId: recipient.id,
                    priority: "CRITICAL",
                    eventCategory: "QUALITY",
                    variables: { ncrNumber: ncr.ncrNumber, site: site.siteCode },
                });
            }
        }
        return ncr;
    }
    async recordContainment(ncrRecordId, immediateContainmentAction) {
        const updatedBy = (0, quality_context_1.requireActorUserId)();
        const ncr = await this.prisma.withRls((tx) => tx.ncrRecord.findUniqueOrThrow({ where: { id: ncrRecordId } }));
        (0, ncr_lifecycle_1.validateNcrStatusTransition)(ncr.status, "CONTAINMENT");
        return this.prisma.withRls((tx) => tx.ncrRecord.update({ where: { id: ncrRecordId }, data: { status: "CONTAINMENT", immediateContainmentAction, updatedBy } }));
    }
    /** CONTAINMENT->DISPOSITION_PENDING, submit workflow QUALITY_NCR 3-stage. */
    async proposeDisposition(ncrRecordId, input) {
        const actorId = (0, quality_context_1.requireActorUserId)();
        const ncr = await this.prisma.withRls((tx) => tx.ncrRecord.findUniqueOrThrow({ where: { id: ncrRecordId } }));
        if (ncr.workflowInstanceId) {
            throw new Error("ncr_records sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
        }
        (0, ncr_lifecycle_1.validateNcrStatusTransition)(ncr.status, "DISPOSITION_PENDING");
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureNcrWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(NCR_WORKFLOW_ENTITY_TYPE, ncrRecordId, definition.id, {});
        return this.prisma.withRls((tx) => tx.ncrRecord.update({
            where: { id: ncrRecordId },
            data: {
                status: "DISPOSITION_PENDING",
                disposition: input.disposition,
                dispositionJustification: input.dispositionJustification,
                reInspectionRequired: (0, ncr_lifecycle_1.resolveReInspectionRequired)(input.disposition),
                workflowInstanceId: instance.id,
                updatedBy: actorId,
            },
        }));
    }
    /** Dipanggil NcrWorkflowCompletionListener saat workflow APPROVED. */
    async markDispositionApproved(ncrRecordId) {
        const ncr = await this.prisma.withRls((tx) => tx.ncrRecord.findUniqueOrThrow({ where: { id: ncrRecordId } }));
        (0, ncr_lifecycle_1.validateNcrStatusTransition)(ncr.status, "DISPOSITIONED");
        return this.prisma.withRls((tx) => tx.ncrRecord.update({
            where: { id: ncrRecordId },
            data: { status: "DISPOSITIONED", dispositionApprovedAt: new Date(), workflowInstanceId: null },
        }));
    }
    /** Dipanggil NcrWorkflowCompletionListener saat workflow REJECTED — kembali CONTAINMENT, disposisi diajukan ulang. */
    async returnToContainment(ncrRecordId) {
        return this.prisma.withRls((tx) => tx.ncrRecord.update({ where: { id: ncrRecordId }, data: { status: "CONTAINMENT", workflowInstanceId: null } }));
    }
    async recordReInspectionResult(ncrRecordId, result) {
        const updatedBy = (0, quality_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.ncrRecord.update({ where: { id: ncrRecordId }, data: { reInspectionResult: result, updatedBy } }));
    }
    /** BR-01 — manual link, lihat banner comment kelas ini. */
    async linkCapaRegister(ncrRecordId, capaRegisterId) {
        const updatedBy = (0, quality_context_1.requireActorUserId)();
        const ncr = await this.prisma.withRls((tx) => tx.ncrRecord.findUniqueOrThrow({ where: { id: ncrRecordId } }));
        (0, ncr_lifecycle_1.validateNcrStatusTransition)(ncr.status, "CAPA_LINKED");
        return this.prisma.withRls((tx) => tx.ncrRecord.update({ where: { id: ncrRecordId }, data: { capaRegisterId, status: "CAPA_LINKED", updatedBy } }));
    }
    async close(ncrRecordId) {
        const updatedBy = (0, quality_context_1.requireActorUserId)();
        const ncr = await this.prisma.withRls((tx) => tx.ncrRecord.findUniqueOrThrow({ where: { id: ncrRecordId } }));
        (0, ncr_lifecycle_1.validateNcrStatusTransition)(ncr.status, "CLOSED");
        (0, ncr_lifecycle_1.assertCapaRequiredBeforeClose)(ncr.severity, ncr.capaRegisterId);
        (0, ncr_lifecycle_1.assertReInspectionPassedBeforeClose)(ncr.disposition, ncr.reInspectionResult);
        return this.prisma.withRls((tx) => tx.ncrRecord.update({ where: { id: ncrRecordId }, data: { status: "CLOSED", closedDate: new Date(), closedBy: updatedBy, updatedBy } }));
    }
    async cancel(ncrRecordId) {
        const updatedBy = (0, quality_context_1.requireActorUserId)();
        const ncr = await this.prisma.withRls((tx) => tx.ncrRecord.findUniqueOrThrow({ where: { id: ncrRecordId } }));
        (0, ncr_lifecycle_1.validateNcrStatusTransition)(ncr.status, "CANCELLED");
        return this.prisma.withRls((tx) => tx.ncrRecord.update({ where: { id: ncrRecordId }, data: { status: "CANCELLED", updatedBy } }));
    }
    async getById(ncrRecordId) {
        return this.prisma.withRls((tx) => tx.ncrRecord.findUniqueOrThrow({ where: { id: ncrRecordId } }));
    }
    async listBySite(siteId) {
        return this.prisma.withRls((tx) => tx.ncrRecord.findMany({ where: { siteId, deletedAt: null }, orderBy: { detectedDate: "desc" } }));
    }
};
exports.NcrRecordService = NcrRecordService;
exports.NcrRecordService = NcrRecordService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        quality_workflow_bootstrap_service_1.QualityWorkflowBootstrapService,
        workflow_engine_service_1.WorkflowEngineService,
        notification_service_1.NotificationService])
], NcrRecordService);
