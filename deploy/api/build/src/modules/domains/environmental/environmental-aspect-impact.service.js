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
exports.EnvironmentalAspectImpactService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const environmental_context_1 = require("./environmental-context");
const aspect_impact_lifecycle_1 = require("./aspect-impact-lifecycle");
const environmental_workflow_bootstrap_service_1 = require("./environmental-workflow-bootstrap.service");
const ASPECT_NUMBERING_MODULE_CODE = "ENV_ASPECT";
const ASPECT_REVIEW_WORKFLOW_ENTITY_TYPE = "environmental_aspect_impact";
// PRD §5 literal significance_threshold "default per tenant" — TIDAK ADA
// tabel konfigurasi tenant-wide utk default ini (§13 poin 1 sendiri
// mengakui "Phase 1 cukup field manual per record") — dipakai sbg fallback
// kalau caller tidak menyuplai threshold eksplisit. Skala rata-rata 5
// skor 1-5, titik tengah dipilih (bukan angka literal PRD), gap TDD §26.
const DEFAULT_SIGNIFICANCE_THRESHOLD = 3.5;
/**
 * Task 5.2 (Modul 12 §4.1, §3 "Environmental Officer | environmental.aspect_impact.create",
 * "HSE Manager | environmental.aspect_impact.approve"). BELUM ada
 * controller HTTP. CAPA-linkage (BR-01, `capa_id`) TETAP MANUAL — caller
 * wajib `CapaRegisterService.create({sourceType:"ENVIRONMENTAL_ASPECT_IMPACT",...})`
 * SENDIRI dulu baru `linkCapaRegister()`, pola sama Quality 5.1.
 */
let EnvironmentalAspectImpactService = class EnvironmentalAspectImpactService {
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
        const createdBy = (0, environmental_context_1.requireActorUserId)();
        const tenantId = (0, environmental_context_1.requireTenantId)();
        await this.bootstrapService.ensureAspectNumberingConfig(input.siteId);
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
        const registerNumber = await this.numberingService.generateNext(ASPECT_NUMBERING_MODULE_CODE, {
            scopeId: input.siteId,
            variables: { SITE_CODE: site.siteCode },
        });
        const significanceScore = (0, aspect_impact_lifecycle_1.calculateSignificanceScore)(input.scores);
        const significanceThreshold = input.significanceThreshold ?? DEFAULT_SIGNIFICANCE_THRESHOLD;
        const significanceLevel = (0, aspect_impact_lifecycle_1.deriveSignificanceLevel)(significanceScore, significanceThreshold);
        const aspect = await this.prisma.withRls((tx) => tx.environmentalAspectImpact.create({
            data: {
                tenantId,
                companyId: input.companyId,
                branchId: input.branchId,
                siteId: input.siteId,
                departmentId: input.departmentId,
                registerNumber,
                lifeCycleStage: input.lifeCycleStage,
                conditionType: input.conditionType,
                activityProcessArea: input.activityProcessArea,
                environmentalAspect: input.environmentalAspect,
                environmentalImpact: input.environmentalImpact,
                impactType: input.impactType,
                likelihoodScore: input.scores.likelihoodScore,
                severityScore: input.scores.severityScore,
                frequencyScore: input.scores.frequencyScore,
                regulatoryScore: input.scores.regulatoryScore,
                stakeholderConcernScore: input.scores.stakeholderConcernScore,
                scoringWeightDetail: input.scoringWeightDetail,
                significanceScore,
                significanceThreshold,
                significanceLevel,
                existingControls: input.existingControls,
                isRegulated: input.isRegulated ?? false,
                relatedPermitId: input.relatedPermitId,
                status: "DRAFT",
                createdBy,
                updatedBy: createdBy,
            },
        }));
        // PRD §8 "aspek signifikan tanpa CAPA/kontrol memadai | HSE Manager |
        // In-app" — dipicu SAAT create() BILA SIGNIFICANT tanpa existing_controls
        // (interpretasi: dicek di titik SAMA BR-01 dievaluasi nanti di
        // markApproved(), bukan scan job terjadwal — PRD tidak beri timing
        // eksplisit "kapan" notifikasi ini terkirim), gap TDD §26.
        if (significanceLevel === "SIGNIFICANT" && !input.existingControls) {
            const recipients = await this.prisma.withRls((tx) => tx.user.findMany({ where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } }, select: { id: true } }));
            for (const recipient of recipients) {
                await this.notificationService.enqueue({
                    eventType: "ENVIRONMENTAL_ASPECT_SIGNIFICANT_NO_CONTROLS",
                    entityType: "ENVIRONMENTAL_ASPECT_IMPACT",
                    entityId: aspect.id,
                    recipientUserId: recipient.id,
                    priority: "HIGH",
                    eventCategory: "ENVIRONMENTAL",
                    variables: { activityProcessArea: aspect.activityProcessArea },
                });
            }
        }
        return aspect;
    }
    /** DRAFT->UNDER_REVIEW, submit workflow ENV_ASPECT_REVIEW 2-stage. */
    async submitForReview(aspectImpactId) {
        const actorId = (0, environmental_context_1.requireActorUserId)();
        const aspect = await this.prisma.withRls((tx) => tx.environmentalAspectImpact.findUniqueOrThrow({ where: { id: aspectImpactId } }));
        if (aspect.workflowInstanceId) {
            throw new Error("environmental_aspects_impacts sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
        }
        (0, aspect_impact_lifecycle_1.validateAspectImpactStatusTransition)(aspect.status, "UNDER_REVIEW");
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureAspectReviewWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(ASPECT_REVIEW_WORKFLOW_ENTITY_TYPE, aspectImpactId, definition.id, {});
        return this.prisma.withRls((tx) => tx.environmentalAspectImpact.update({
            where: { id: aspectImpactId },
            data: { status: "UNDER_REVIEW", workflowInstanceId: instance.id, updatedBy: actorId },
        }));
    }
    /** Dipanggil EnvironmentalAspectReviewWorkflowCompletionListener saat workflow APPROVED. BR-01 ditegakkan di sini. */
    async markApproved(aspectImpactId) {
        const aspect = await this.prisma.withRls((tx) => tx.environmentalAspectImpact.findUniqueOrThrow({ where: { id: aspectImpactId } }));
        (0, aspect_impact_lifecycle_1.validateAspectImpactStatusTransition)(aspect.status, "ACTIVE");
        (0, aspect_impact_lifecycle_1.assertControlsAdequateForActive)(aspect.significanceLevel, aspect.existingControls, aspect.capaRegisterId);
        const nextReviewDate = new Date();
        nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 1);
        return this.prisma.withRls((tx) => tx.environmentalAspectImpact.update({
            where: { id: aspectImpactId },
            data: { status: "ACTIVE", reviewDate: new Date(), nextReviewDate, workflowInstanceId: null },
        }));
    }
    /** Dipanggil listener saat workflow REJECTED — kembali DRAFT utk revisi. */
    async returnToDraft(aspectImpactId) {
        return this.prisma.withRls((tx) => tx.environmentalAspectImpact.update({ where: { id: aspectImpactId }, data: { status: "DRAFT", workflowInstanceId: null } }));
    }
    /** BR-01 — manual link, lihat banner comment kelas ini. */
    async linkCapaRegister(aspectImpactId, capaRegisterId) {
        const updatedBy = (0, environmental_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.environmentalAspectImpact.update({ where: { id: aspectImpactId }, data: { capaRegisterId, updatedBy } }));
    }
    async getById(aspectImpactId) {
        return this.prisma.withRls((tx) => tx.environmentalAspectImpact.findUniqueOrThrow({ where: { id: aspectImpactId } }));
    }
    async listBySite(siteId) {
        return this.prisma.withRls((tx) => tx.environmentalAspectImpact.findMany({ where: { siteId }, orderBy: { createdAt: "desc" } }));
    }
};
exports.EnvironmentalAspectImpactService = EnvironmentalAspectImpactService;
exports.EnvironmentalAspectImpactService = EnvironmentalAspectImpactService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        environmental_workflow_bootstrap_service_1.EnvironmentalWorkflowBootstrapService,
        workflow_engine_service_1.WorkflowEngineService,
        notification_service_1.NotificationService])
], EnvironmentalAspectImpactService);
