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
exports.HiradcRecordService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const numbering_service_1 = require("../../../../platform/numbering/numbering.service");
const workflow_engine_service_1 = require("../../../../platform/workflow-engine/workflow-engine.service");
const risk_matrix_context_1 = require("../matrix/risk-matrix-context");
const risk_matrix_lookup_1 = require("../matrix/risk-matrix-lookup");
const hiradc_lifecycle_1 = require("./hiradc-lifecycle");
const risk_workflow_bootstrap_service_1 = require("./risk-workflow-bootstrap.service");
const HIRADC_NUMBERING_MODULE_CODE = "HIRADC";
const HIRADC_WORKFLOW_ENTITY_TYPE = "hiradc_record";
// Task 3.2 (Modul 05 §4.3/§5/§6 BR-03/BR-04). BELUM ada controller HTTP —
// risk.hiradc.* sudah di-seed RBAC baseline (task 114).
let HiradcRecordService = class HiradcRecordService {
    prisma;
    numberingService;
    workflowEngineService;
    bootstrapService;
    constructor(prisma, numberingService, workflowEngineService, bootstrapService) {
        this.prisma = prisma;
        this.numberingService = numberingService;
        this.workflowEngineService = workflowEngineService;
        this.bootstrapService = bootstrapService;
    }
    async create(input) {
        const createdBy = (0, risk_matrix_context_1.requireActorUserId)();
        const tenantId = (0, risk_matrix_context_1.requireTenantId)();
        await this.bootstrapService.ensureHiradcNumberingConfig();
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
        const hiradcNumber = await this.numberingService.generateNext(HIRADC_NUMBERING_MODULE_CODE, { variables: { SITE_CODE: site.siteCode } });
        return this.prisma.withRls((tx) => tx.hiradcRecord.create({
            data: {
                tenantId,
                hiradcNumber,
                siteId: input.siteId,
                departmentId: input.departmentId,
                relatedHiraId: input.relatedHiraId,
                relatedJsaId: input.relatedJsaId,
                workPermitId: input.workPermitId,
                taskDescription: input.taskDescription,
                performedBy: input.performedBy,
                assessmentDatetime: input.assessmentDatetime,
                validUntil: input.validUntil,
                status: "DRAFT",
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async addLine(hiradcId, input) {
        const createdBy = (0, risk_matrix_context_1.requireActorUserId)();
        const tenantId = (0, risk_matrix_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const hiradc = await tx.hiradcRecord.findUniqueOrThrow({ where: { id: hiradcId } });
            // BR-01 — matriks aktif scope HIRADC (fallback ke ALL kalau tidak
            // ada scope-spesifik), diresolusi via RiskMatrixConfigService LEWAT
            // query langsung di sini (bukan impor service, dalam withRls() yang
            // sama, aman krn murni query bukan cross-service call yang buka
            // transaksinya sendiri).
            const config = (await tx.riskMatrixConfig.findFirst({ where: { tenantId, applicableModuleScope: "HIRADC", isActive: true } })) ??
                (await tx.riskMatrixConfig.findFirst({ where: { tenantId, applicableModuleScope: "ALL", isActive: true } }));
            if (!config) {
                throw new common_1.BadRequestException("Tidak ada risk_matrix_configs aktif utk scope HIRADC maupun ALL pada tenant ini.");
            }
            const cells = await tx.riskMatrixCell.findMany({ where: { riskMatrixConfigId: config.id } });
            const resolved = (0, risk_matrix_lookup_1.resolveRiskScore)(cells, input.likelihood, input.severity);
            return tx.hiradcLine.create({
                data: {
                    tenantId,
                    hiradcId,
                    hazardId: input.hazardId,
                    hazardDescriptionFreetext: input.hazardDescriptionFreetext,
                    likelihood: input.likelihood,
                    severity: input.severity,
                    riskScore: resolved.riskScore,
                    riskLevel: resolved.riskLevel,
                    requiresEscalation: resolved.requiresEscalation,
                    controlMeasures: input.controlMeasures,
                    ppeRequired: (input.ppeRequired ?? []),
                    createdBy,
                },
            });
        });
    }
    async getById(hiradcId) {
        return this.prisma.withRls((tx) => tx.hiradcRecord.findUniqueOrThrow({ where: { id: hiradcId }, include: { lines: true } }));
    }
    /**
     * PRD §4.3 poin 2 — "approval RINGAN, disarankan 1 stage 'Verifikasi
     * Supervisor'... bisa dikonfigurasi TANPA approval formal (VERIFIED
     * oleh pembuat sendiri) utk pekerjaan risiko rendah rutin." useWorkflow
     * (parameter EKSPLISIT dari caller, BUKAN auto-detect risiko — keputusan
     * "pakai workflow atau self-verify" diserahkan ke KEBIJAKAN TENANT/
     * pemanggil, skema tidak py kolom utk auto-decide) menentukan jalur:
     * self-verify -> transisi LANGSUNG DRAFT->VERIFIED; via workflow ->
     * status TETAP DRAFT (pola sama JSA) sampai HiradcWorkflowCompletionListener
     * memproses APPROVED workflow -> VERIFIED (BUKAN APPROVED — stage
     * bernama "Verifikasi", `approve()` terpisah utk lapis opsional
     * berikutnya VERIFIED->APPROVED). BR-03 ditegakkan DI SINI utk KEDUA
     * jalur (bukan di listener) — record yang tidak lengkap tidak boleh
     * masuk status VERIFIED sama sekali, baik lewat self-verify maupun
     * workflow.
     */
    async verify(hiradcId, useWorkflow) {
        const updatedBy = (0, risk_matrix_context_1.requireActorUserId)();
        const { relatedHiraId, relatedJsaId, lineCount, status } = await this.prisma.withRls(async (tx) => {
            const hiradc = await tx.hiradcRecord.findUniqueOrThrow({ where: { id: hiradcId } });
            const count = await tx.hiradcLine.count({ where: { hiradcId } });
            return { relatedHiraId: hiradc.relatedHiraId, relatedJsaId: hiradc.relatedJsaId, lineCount: count, status: hiradc.status };
        });
        (0, hiradc_lifecycle_1.assertHasBaselineOrStandaloneLines)({ relatedHiraId, relatedJsaId, lineCount });
        if (!useWorkflow) {
            (0, hiradc_lifecycle_1.validateHiradcRecordStatusTransition)(status, "VERIFIED");
            return this.prisma.withRls((tx) => tx.hiradcRecord.update({ where: { id: hiradcId }, data: { status: "VERIFIED", updatedBy } }));
        }
        if (status !== "DRAFT") {
            throw new common_1.BadRequestException(`hiradc_records berstatus ${status} tidak dapat diajukan verifikasi ulang (wajib DRAFT).`);
        }
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureHiradcWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(HIRADC_WORKFLOW_ENTITY_TYPE, hiradcId, definition.id, {});
        return this.prisma.withRls((tx) => tx.hiradcRecord.update({ where: { id: hiradcId }, data: { workflowInstanceId: instance.id } }));
    }
    /** Lapis opsional lanjutan VERIFIED->APPROVED (PRD §4.3 poin 2 tersirat,
     * "APPROVED" TETAP nilai enum sah, tidak seluruh HIRADC perlu
     * melewatinya) — transisi LANGSUNG, TANPA workflow tambahan. */
    async approve(hiradcId) {
        const updatedBy = (0, risk_matrix_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const hiradc = await tx.hiradcRecord.findUniqueOrThrow({ where: { id: hiradcId } });
            (0, hiradc_lifecycle_1.validateHiradcRecordStatusTransition)(hiradc.status, "APPROVED");
            return tx.hiradcRecord.update({ where: { id: hiradcId }, data: { status: "APPROVED", updatedBy } });
        });
    }
};
exports.HiradcRecordService = HiradcRecordService;
exports.HiradcRecordService = HiradcRecordService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        workflow_engine_service_1.WorkflowEngineService,
        risk_workflow_bootstrap_service_1.RiskWorkflowBootstrapService])
], HiradcRecordService);
//# sourceMappingURL=hiradc-record.service.js.map