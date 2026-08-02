import { EnvProperAssessmentType, EnvProperCriteriaCategory, EnvProperEvidenceReferenceType, EnvProperRating, ProperSelfAssessment } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { EnvironmentalWorkflowBootstrapService } from "./environmental-workflow-bootstrap.service";
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
export declare class ProperSelfAssessmentService {
    private readonly prisma;
    private readonly bootstrapService;
    private readonly workflowEngineService;
    constructor(prisma: PrismaService, bootstrapService: EnvironmentalWorkflowBootstrapService, workflowEngineService: WorkflowEngineService);
    create(input: CreateProperSelfAssessmentInput): Promise<ProperSelfAssessment>;
    /** Tambah/update satu criteria score + rekalkulasi overall_predicted_rating (BR-06). */
    recordCriteriaScore(assessmentId: string, input: RecordCriteriaScoreInput): Promise<ProperSelfAssessment>;
    private recalculateRating;
    /** BR-06 — override manual rating, wajib override_justification. */
    overrideRating(assessmentId: string, overrideRating: EnvProperRating, overrideJustification: string): Promise<ProperSelfAssessment>;
    /** DRAFT->INTERNAL_REVIEWED (optimistic), submit workflow ENV_PROPER_ASSESSMENT 2-stage. */
    submitForInternalReview(assessmentId: string): Promise<ProperSelfAssessment>;
    /** Dipanggil ProperAssessmentWorkflowCompletionListener saat workflow APPROVED — status sudah INTERNAL_REVIEWED, cukup tutup pointer. */
    markInternalReviewApproved(assessmentId: string): Promise<ProperSelfAssessment>;
    /** Dipanggil listener saat workflow REJECTED — kembali DRAFT utk revisi. */
    returnToDraft(assessmentId: string): Promise<ProperSelfAssessment>;
    /** INTERNAL_REVIEWED->SUBMITTED_TO_KLHK, langkah manual terpisah. */
    submitToKlhk(assessmentId: string): Promise<ProperSelfAssessment>;
    /** SUBMITTED_TO_KLHK->RESULT_RECEIVED, hasil resmi dicatat manual. */
    recordOfficialResult(assessmentId: string, klhkOfficialRating: EnvProperRating): Promise<ProperSelfAssessment>;
    getById(assessmentId: string): Promise<ProperSelfAssessment>;
    listByCompany(companyId: string): Promise<ProperSelfAssessment[]>;
}
