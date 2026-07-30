import { Injectable } from "@nestjs/common";
import { EnvProperAssessmentType, EnvProperCriteriaCategory, EnvProperEvidenceReferenceType, EnvProperRating, ProperSelfAssessment } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { requireActorUserId, requireTenantId } from "./environmental-context";
import {
  assertOverrideJustificationRequired,
  calculateComplianceScorePercentage,
  deriveProperRating,
  validateProperSubmissionStatusTransition,
} from "./proper-assessment-rules";
import { EnvironmentalWorkflowBootstrapService } from "./environmental-workflow-bootstrap.service";

const PROPER_ASSESSMENT_WORKFLOW_ENTITY_TYPE = "proper_self_assessment";

export interface CreateProperSelfAssessmentInput {
  companyId: string;
  siteId: string;
  assessmentPeriod: string;
  assessmentType: EnvProperAssessmentType;
  assessmentDate: Date;
}

export interface RecordCriteriaScoreInput {
  criteriaCategory: EnvProperCriteriaCategory;
  criteriaDescription: string;
  complianceStatus: "FULLY_COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT" | "NOT_APPLICABLE";
  evidenceReferenceType?: EnvProperEvidenceReferenceType;
  evidenceReferenceId?: string;
  scoreValue: number;
  weightPercentage: number;
  notes?: string;
}

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
@Injectable()
export class ProperSelfAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bootstrapService: EnvironmentalWorkflowBootstrapService,
    private readonly workflowEngineService: WorkflowEngineService,
  ) {}

  async create(input: CreateProperSelfAssessmentInput): Promise<ProperSelfAssessment> {
    const assessedBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls((tx) =>
      tx.properSelfAssessment.create({
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
      }),
    );
  }

  /** Tambah/update satu criteria score + rekalkulasi overall_predicted_rating (BR-06). */
  async recordCriteriaScore(assessmentId: string, input: RecordCriteriaScoreInput): Promise<ProperSelfAssessment> {
    const updatedBy = requireActorUserId();
    const tenantId = requireTenantId();

    await this.prisma.withRls((tx) =>
      tx.properSelfAssessmentCriteriaScore.create({
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
      }),
    );

    return this.recalculateRating(assessmentId);
  }

  private async recalculateRating(assessmentId: string): Promise<ProperSelfAssessment> {
    const updatedBy = requireActorUserId();
    const scores = await this.prisma.withRls((tx) =>
      tx.properSelfAssessmentCriteriaScore.findMany({ where: { properSelfAssessmentId: assessmentId }, select: { scoreValue: true, weightPercentage: true } }),
    );
    const complianceScorePercentage = calculateComplianceScorePercentage(
      scores.map((s) => ({ scoreValue: Number(s.scoreValue), weightPercentage: Number(s.weightPercentage) })),
    );
    const overallPredictedRating = deriveProperRating(complianceScorePercentage);

    return this.prisma.withRls((tx) =>
      tx.properSelfAssessment.update({
        where: { id: assessmentId },
        data: { complianceScorePercentage, overallPredictedRating, updatedBy },
      }),
    );
  }

  /** BR-06 — override manual rating, wajib override_justification. */
  async overrideRating(assessmentId: string, overrideRating: EnvProperRating, overrideJustification: string): Promise<ProperSelfAssessment> {
    const updatedBy = requireActorUserId();
    assertOverrideJustificationRequired(true, overrideJustification);
    return this.prisma.withRls((tx) =>
      tx.properSelfAssessment.update({
        where: { id: assessmentId },
        data: { overallPredictedRating: overrideRating, overrideJustification, updatedBy },
      }),
    );
  }

  /** DRAFT->INTERNAL_REVIEWED (optimistic), submit workflow ENV_PROPER_ASSESSMENT 2-stage. */
  async submitForInternalReview(assessmentId: string): Promise<ProperSelfAssessment> {
    const actorId = requireActorUserId();
    const assessment = await this.prisma.withRls((tx) => tx.properSelfAssessment.findUniqueOrThrow({ where: { id: assessmentId } }));
    if (assessment.workflowInstanceId) {
      throw new Error("proper_self_assessment sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
    }
    validateProperSubmissionStatusTransition(assessment.submissionStatus, "INTERNAL_REVIEWED");

    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureProperAssessmentWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(PROPER_ASSESSMENT_WORKFLOW_ENTITY_TYPE, assessmentId, definition.id, {});

    return this.prisma.withRls((tx) =>
      tx.properSelfAssessment.update({
        where: { id: assessmentId },
        data: { submissionStatus: "INTERNAL_REVIEWED", workflowInstanceId: instance.id, updatedBy: actorId },
      }),
    );
  }

  /** Dipanggil ProperAssessmentWorkflowCompletionListener saat workflow APPROVED — status sudah INTERNAL_REVIEWED, cukup tutup pointer. */
  async markInternalReviewApproved(assessmentId: string): Promise<ProperSelfAssessment> {
    return this.prisma.withRls((tx) => tx.properSelfAssessment.update({ where: { id: assessmentId }, data: { workflowInstanceId: null } }));
  }

  /** Dipanggil listener saat workflow REJECTED — kembali DRAFT utk revisi. */
  async returnToDraft(assessmentId: string): Promise<ProperSelfAssessment> {
    return this.prisma.withRls((tx) =>
      tx.properSelfAssessment.update({ where: { id: assessmentId }, data: { submissionStatus: "DRAFT", workflowInstanceId: null } }),
    );
  }

  /** INTERNAL_REVIEWED->SUBMITTED_TO_KLHK, langkah manual terpisah. */
  async submitToKlhk(assessmentId: string): Promise<ProperSelfAssessment> {
    const updatedBy = requireActorUserId();
    const assessment = await this.prisma.withRls((tx) => tx.properSelfAssessment.findUniqueOrThrow({ where: { id: assessmentId } }));
    validateProperSubmissionStatusTransition(assessment.submissionStatus, "SUBMITTED_TO_KLHK");
    return this.prisma.withRls((tx) =>
      tx.properSelfAssessment.update({ where: { id: assessmentId }, data: { submissionStatus: "SUBMITTED_TO_KLHK", updatedBy } }),
    );
  }

  /** SUBMITTED_TO_KLHK->RESULT_RECEIVED, hasil resmi dicatat manual. */
  async recordOfficialResult(assessmentId: string, klhkOfficialRating: EnvProperRating): Promise<ProperSelfAssessment> {
    const updatedBy = requireActorUserId();
    const assessment = await this.prisma.withRls((tx) => tx.properSelfAssessment.findUniqueOrThrow({ where: { id: assessmentId } }));
    validateProperSubmissionStatusTransition(assessment.submissionStatus, "RESULT_RECEIVED");
    return this.prisma.withRls((tx) =>
      tx.properSelfAssessment.update({
        where: { id: assessmentId },
        data: { submissionStatus: "RESULT_RECEIVED", klhkOfficialRating, klhkRatingReceivedDate: new Date(), updatedBy },
      }),
    );
  }

  async getById(assessmentId: string): Promise<ProperSelfAssessment> {
    return this.prisma.withRls((tx) => tx.properSelfAssessment.findUniqueOrThrow({ where: { id: assessmentId } }));
  }

  async listByCompany(companyId: string): Promise<ProperSelfAssessment[]> {
    return this.prisma.withRls((tx) => tx.properSelfAssessment.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }));
  }
}
