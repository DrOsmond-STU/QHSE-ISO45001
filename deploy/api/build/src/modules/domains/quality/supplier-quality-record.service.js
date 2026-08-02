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
exports.SupplierQualityRecordService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const quality_context_1 = require("./quality-context");
const supplier_quality_rules_1 = require("./supplier-quality-rules");
const quality_workflow_bootstrap_service_1 = require("./quality-workflow-bootstrap.service");
const SUPPLIER_EVAL_WORKFLOW_ENTITY_TYPE = "supplier_quality_record";
/**
 * Task 5.1 (Modul 11 §4.4, §3 "Supplier Quality Engineer | quality.supplier_evaluation.create/submit",
 * "Quality Manager | quality.supplier_evaluation.approve"). BELUM ada
 * controller HTTP. `ncr_count_period` DIISI CALLER (query lintas
 * ncr_records ada di service, bukan trigger DB — PRD §5 tidak beri
 * mekanisme kalkulasi otomatis eksplisit).
 */
let SupplierQualityRecordService = class SupplierQualityRecordService {
    prisma;
    bootstrapService;
    workflowEngineService;
    constructor(prisma, bootstrapService, workflowEngineService) {
        this.prisma = prisma;
        this.bootstrapService = bootstrapService;
        this.workflowEngineService = workflowEngineService;
    }
    async create(input) {
        const evaluatedBy = (0, quality_context_1.requireActorUserId)();
        const tenantId = (0, quality_context_1.requireTenantId)();
        const ncrCountPeriod = await this.prisma.withRls((tx) => tx.ncrRecord.count({
            where: {
                supplierCode: input.supplierCode,
                ncrSource: "SUPPLIER",
                detectedDate: { gte: input.evaluationPeriodStart, lte: input.evaluationPeriodEnd },
                deletedAt: null,
            },
        }));
        return this.prisma.withRls((tx) => tx.supplierQualityRecord.create({
            data: {
                tenantId,
                companyId: input.companyId,
                supplierCode: input.supplierCode,
                supplierName: input.supplierName,
                supplierCategory: input.supplierCategory,
                evaluationType: input.evaluationType,
                evaluationPeriodStart: input.evaluationPeriodStart,
                evaluationPeriodEnd: input.evaluationPeriodEnd,
                qualityScore: input.qualityScore,
                deliveryScore: input.deliveryScore,
                responsivenessScore: input.responsivenessScore,
                overallScore: input.overallScore,
                scoringDetail: input.scoringDetail ?? undefined,
                ncrCountPeriod,
                rating: "APPROVED",
                evaluatedBy,
                evaluationDate: new Date(),
                nextEvaluationDueDate: input.nextEvaluationDueDate,
                status: "DRAFT",
                createdBy: evaluatedBy,
                updatedBy: evaluatedBy,
            },
        }));
    }
    async submitForApproval(supplierQualityRecordId, rating) {
        const actorId = (0, quality_context_1.requireActorUserId)();
        const record = await this.prisma.withRls((tx) => tx.supplierQualityRecord.findUniqueOrThrow({ where: { id: supplierQualityRecordId } }));
        (0, supplier_quality_rules_1.validateSupplierRecordStatusTransition)(record.status, "SUBMITTED");
        if (record.workflowInstanceId) {
            throw new Error("supplier_quality_records sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
        }
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureSupplierEvalWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(SUPPLIER_EVAL_WORKFLOW_ENTITY_TYPE, supplierQualityRecordId, definition.id, {});
        return this.prisma.withRls((tx) => tx.supplierQualityRecord.update({
            where: { id: supplierQualityRecordId },
            data: { status: "SUBMITTED", rating, workflowInstanceId: instance.id, updatedBy: actorId },
        }));
    }
    /** Dipanggil SupplierEvalWorkflowCompletionListener saat workflow APPROVED. BR-04-analog dicek DI SINI (bukan submit) — rating final baru genuinely diketahui setelah approval. */
    async markApproved(supplierQualityRecordId) {
        const record = await this.prisma.withRls((tx) => tx.supplierQualityRecord.findUniqueOrThrow({ where: { id: supplierQualityRecordId } }));
        (0, supplier_quality_rules_1.validateSupplierRecordStatusTransition)(record.status, "APPROVED");
        const correctiveActionRequired = record.rating === "CONDITIONAL" || record.rating === "SUSPENDED";
        return this.prisma.withRls((tx) => tx.supplierQualityRecord.update({
            where: { id: supplierQualityRecordId },
            data: { status: "APPROVED", correctiveActionRequired, workflowInstanceId: null },
        }));
    }
    async returnToDraft(supplierQualityRecordId) {
        return this.prisma.withRls((tx) => tx.supplierQualityRecord.update({ where: { id: supplierQualityRecordId }, data: { status: "DRAFT", workflowInstanceId: null } }));
    }
    /** §4.4 poin 3 — manual link, pola sama NcrRecordService.linkCapaRegister(). */
    async linkCapaRegister(supplierQualityRecordId, capaRegisterId) {
        const updatedBy = (0, quality_context_1.requireActorUserId)();
        const record = await this.prisma.withRls((tx) => tx.supplierQualityRecord.findUniqueOrThrow({ where: { id: supplierQualityRecordId } }));
        (0, supplier_quality_rules_1.assertCapaRequiredForRating)(record.rating, capaRegisterId);
        return this.prisma.withRls((tx) => tx.supplierQualityRecord.update({ where: { id: supplierQualityRecordId }, data: { capaRegisterId, updatedBy } }));
    }
    async archive(supplierQualityRecordId) {
        const updatedBy = (0, quality_context_1.requireActorUserId)();
        const record = await this.prisma.withRls((tx) => tx.supplierQualityRecord.findUniqueOrThrow({ where: { id: supplierQualityRecordId } }));
        (0, supplier_quality_rules_1.validateSupplierRecordStatusTransition)(record.status, "ARCHIVED");
        return this.prisma.withRls((tx) => tx.supplierQualityRecord.update({ where: { id: supplierQualityRecordId }, data: { status: "ARCHIVED", updatedBy } }));
    }
    async getById(supplierQualityRecordId) {
        return this.prisma.withRls((tx) => tx.supplierQualityRecord.findUniqueOrThrow({ where: { id: supplierQualityRecordId } }));
    }
};
exports.SupplierQualityRecordService = SupplierQualityRecordService;
exports.SupplierQualityRecordService = SupplierQualityRecordService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        quality_workflow_bootstrap_service_1.QualityWorkflowBootstrapService,
        workflow_engine_service_1.WorkflowEngineService])
], SupplierQualityRecordService);
