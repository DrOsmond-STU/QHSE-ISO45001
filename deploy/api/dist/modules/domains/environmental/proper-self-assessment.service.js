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
exports.ProperSelfAssessmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const environmental_context_1 = require("./environmental-context");
const proper_assessment_rules_1 = require("./proper-assessment-rules");
const environmental_workflow_bootstrap_service_1 = require("./environmental-workflow-bootstrap.service");
const PROPER_ASSESSMENT_WORKFLOW_ENTITY_TYPE = "proper_self_assessment";
/**
 * Task 5.2 (Modul 12 §4.4, §3 "Environmental Officer/HSE Manager | environmental.proper_assessment.create",
 * "HSE Manager | environmental.proper_assessment.approve"). BELUM ada
 * controller HTTP. `submission_status` literal 4 nilai (DRAFT/INTERNAL_REVIEWED/
 * SUBMITTED_TO_KLHK/RESULT_RECEIVED) TIDAK punya state "sedang direview"
 * terpisah — `submitForInternalReview()` set status=INTERNAL_REVIEWED
 * SEGERA saat workflow ENV_PROPER_ASSESSMENT dimulai (optimistic, gap TDD
 * §26); APPROVED listener HANYA menutup workflow_instance_id (status sudah
 * benar), REJECTED mengembalikan ke DRAFT. `submitToKlhk()` langkah manual
 * TERPISAH setelah INTERNAL_REVIEWED (PRD "khususnya sebelum submission
 * resmi" dibaca sbg aksi eksplisit tersendiri, bukan otomatis lanjut).
 */
let ProperSelfAssessmentService = class ProperSelfAssessmentService {
    prisma;
    bootstrapService;
    workflowEngineService;
    constructor(prisma, bootstrapService, workflowEngineService) {
        this.prisma = prisma;
        this.bootstrapService = bootstrapService;
        this.workflowEngineService = workflowEngineService;
    }
    async create(input) {
        const assessedBy = (0, environmental_context_1.requireActorUserId)();
        const tenantId = (0, environmental_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.properSelfAssessment.create({
            data: {
                tenantId,
                companyId: input.companyId,
                siteId: input.siteId,
                assessmentPeriod: input.assessmentPeriod,
                assessmentType: input.assessmentType,
                assessedBy,
                assessmentDate: input.assessmentDate,
                submissionStatus: "DRAFT",
                createdBy: assessedBy,
                updatedBy: assessedBy,
            },
        }));
    }
    /** Tambah/update satu criteria score + rekalkulasi overall_predicted_rating (BR-06). */
    async recordCriteriaScore(assessmentId, input) {
        const updatedBy = (0, environmental_context_1.requireActorUserId)();
        const tenantId = (0, environmental_context_1.requireTenantId)();
        await this.prisma.withRls((tx) => tx.properSelfAssessmentCriteriaScore.create({
            data: {
                tenantId,
                properSelfAssessmentId: assessmentId,
                criteriaCategory: input.criteriaCategory,
                criteriaDescription: input.criteriaDescription,
                complianceStatus: input.complianceStatus,
                evidenceReferenceType: input.evidenceReferenceType,
                evidenceReferenceId: input.evidenceReferenceId,
                scoreValue: input.scoreValue,
                weightPercentage: input.weightPercentage,
                notes: input.notes,
                createdBy: updatedBy,
                updatedBy,
            },
        }));
        return this.recalculateRating(assessmentId);
    }
    async recalculateRating(assessmentId) {
        const updatedBy = (0, environmental_context_1.requireActorUserId)();
        const scores = await this.prisma.withRls((tx) => tx.properSelfAssessmentCriteriaScore.findMany({ where: { properSelfAssessmentId: assessmentId }, select: { scoreValue: true, weightPercentage: true } }));
        const complianceScorePercentage = (0, proper_assessment_rules_1.calculateComplianceScorePercentage)(scores.map((s) => ({ scoreValue: Number(s.scoreValue), weightPercentage: Number(s.weightPercentage) })));
        const overallPredictedRating = (0, proper_assessment_rules_1.deriveProperRating)(complianceScorePercentage);
        return this.prisma.withRls((tx) => tx.properSelfAssessment.update({
            where: { id: assessmentId },
            data: { complianceScorePercentage, overallPredictedRating, updatedBy },
        }));
    }
    /** BR-06 — override manual rating, wajib override_justification. */
    async overrideRating(assessmentId, overrideRating, overrideJustification) {
        const updatedBy = (0, environmental_context_1.requireActorUserId)();
        (0, proper_assessment_rules_1.assertOverrideJustificationRequired)(true, overrideJustification);
        return this.prisma.withRls((tx) => tx.properSelfAssessment.update({
            where: { id: assessmentId },
            data: { overallPredictedRating: overrideRating, overrideJustification, updatedBy },
        }));
    }
    /** DRAFT->INTERNAL_REVIEWED (optimistic), submit workflow ENV_PROPER_ASSESSMENT 2-stage. */
    async submitForInternalReview(assessmentId) {
        const actorId = (0, environmental_context_1.requireActorUserId)();
        const assessment = await this.prisma.withRls((tx) => tx.properSelfAssessment.findUniqueOrThrow({ where: { id: assessmentId } }));
        if (assessment.workflowInstanceId) {
            throw new Error("proper_self_assessment sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
        }
        (0, proper_assessment_rules_1.validateProperSubmissionStatusTransition)(assessment.submissionStatus, "INTERNAL_REVIEWED");
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureProperAssessmentWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(PROPER_ASSESSMENT_WORKFLOW_ENTITY_TYPE, assessmentId, definition.id, {});
        return this.prisma.withRls((tx) => tx.properSelfAssessment.update({
            where: { id: assessmentId },
            data: { submissionStatus: "INTERNAL_REVIEWED", workflowInstanceId: instance.id, updatedBy: actorId },
        }));
    }
    /** Dipanggil ProperAssessmentWorkflowCompletionListener saat workflow APPROVED — status sudah INTERNAL_REVIEWED, cukup tutup pointer. */
    async markInternalReviewApproved(assessmentId) {
        return this.prisma.withRls((tx) => tx.properSelfAssessment.update({ where: { id: assessmentId }, data: { workflowInstanceId: null } }));
    }
    /** Dipanggil listener saat workflow REJECTED — kembali DRAFT utk revisi. */
    async returnToDraft(assessmentId) {
        return this.prisma.withRls((tx) => tx.properSelfAssessment.update({ where: { id: assessmentId }, data: { submissionStatus: "DRAFT", workflowInstanceId: null } }));
    }
    /** INTERNAL_REVIEWED->SUBMITTED_TO_KLHK, langkah manual terpisah. */
    async submitToKlhk(assessmentId) {
        const updatedBy = (0, environmental_context_1.requireActorUserId)();
        const assessment = await this.prisma.withRls((tx) => tx.properSelfAssessment.findUniqueOrThrow({ where: { id: assessmentId } }));
        (0, proper_assessment_rules_1.validateProperSubmissionStatusTransition)(assessment.submissionStatus, "SUBMITTED_TO_KLHK");
        return this.prisma.withRls((tx) => tx.properSelfAssessment.update({ where: { id: assessmentId }, data: { submissionStatus: "SUBMITTED_TO_KLHK", updatedBy } }));
    }
    /** SUBMITTED_TO_KLHK->RESULT_RECEIVED, hasil resmi dicatat manual. */
    async recordOfficialResult(assessmentId, klhkOfficialRating) {
        const updatedBy = (0, environmental_context_1.requireActorUserId)();
        const assessment = await this.prisma.withRls((tx) => tx.properSelfAssessment.findUniqueOrThrow({ where: { id: assessmentId } }));
        (0, proper_assessment_rules_1.validateProperSubmissionStatusTransition)(assessment.submissionStatus, "RESULT_RECEIVED");
        return this.prisma.withRls((tx) => tx.properSelfAssessment.update({
            where: { id: assessmentId },
            data: { submissionStatus: "RESULT_RECEIVED", klhkOfficialRating, klhkRatingReceivedDate: new Date(), updatedBy },
        }));
    }
    async getById(assessmentId) {
        return this.prisma.withRls((tx) => tx.properSelfAssessment.findUniqueOrThrow({ where: { id: assessmentId } }));
    }
    async listByCompany(companyId) {
        return this.prisma.withRls((tx) => tx.properSelfAssessment.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }));
    }
};
exports.ProperSelfAssessmentService = ProperSelfAssessmentService;
exports.ProperSelfAssessmentService = ProperSelfAssessmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        environmental_workflow_bootstrap_service_1.EnvironmentalWorkflowBootstrapService,
        workflow_engine_service_1.WorkflowEngineService])
], ProperSelfAssessmentService);
//# sourceMappingURL=proper-self-assessment.service.js.map