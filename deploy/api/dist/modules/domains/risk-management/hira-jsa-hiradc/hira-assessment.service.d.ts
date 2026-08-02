import { ControlHierarchy, HiraAssessment, HiraAssessmentType, HiraHazardLine, HiraTeamMember } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../../platform/numbering/numbering.service";
import { WorkflowEngineService } from "../../../../platform/workflow-engine/workflow-engine.service";
import { RiskWorkflowBootstrapService } from "./risk-workflow-bootstrap.service";
export interface CreateHiraAssessmentInput {
    siteId: string;
    departmentId?: string;
    activityDescription: string;
    assessmentType: HiraAssessmentType;
    riskMatrixConfigId: string;
    assessmentDate: Date;
    reviewDueDate?: Date;
}
export interface AddHiraHazardLineInput {
    hazardId?: string;
    hazardDescriptionFreetext?: string;
    existingControls?: string;
    likelihoodBefore: number;
    severityBefore: number;
    additionalControlsRequired?: string;
    controlHierarchy?: ControlHierarchy;
    likelihoodAfter: number;
    severityAfter: number;
    responsibleUserId?: string;
    targetCompletionDate?: Date;
}
export declare class HiraAssessmentService {
    private readonly prisma;
    private readonly numberingService;
    private readonly workflowEngineService;
    private readonly bootstrapService;
    constructor(prisma: PrismaService, numberingService: NumberingService, workflowEngineService: WorkflowEngineService, bootstrapService: RiskWorkflowBootstrapService);
    /**
     * BR-01 analog (hira_number) via NumberingService (0.10, module_code=HIRA)
     * — EMPAT langkah TERPISAH, alasan PERSIS DocumentService.createDocument()
     * (2.1)/ComplianceEvaluationService.create() (2.2): ensureNumberingConfig()
     * maupun generateNext() membuka withRls()-nya masing-masing. Pattern
     * `{SITE_CODE}` (PRD §5 disarankan literal utk hira_number, BEDA dari DMS
     * 2.1 yang menjatuhkannya krn documents.site_id NULLABLE) — hira_assessments.site_id
     * WAJIB (bukan nullable), jadi token ini AMAN dipakai, disuplai via
     * `variables` (token DISPLAY murni, BUKAN `scopeId` — counter TETAP
     * tenant-wide SATU, `scopeId` adalah konsep partisi counter yang BEDA,
     * lihat banner comment RiskWorkflowBootstrapService.ensureNumberingConfig()).
     */
    create(input: CreateHiraAssessmentInput): Promise<HiraAssessment>;
    addTeamMember(hiraId: string, userId: string, roleInTeam?: string): Promise<HiraTeamMember>;
    /**
     * BR-01 (PRD §6) — risk_score/risk_level before+after dihitung OTOMATIS
     * dari risk_matrix_cells (resolveRiskScore(), task 3.1), bukan input
     * manual. requiresEscalation TERSIMPAN diambil dari cell AFTER (dipakai
     * BR-06 nanti kalau baris ini jadi source risk_treatment_plans) — flag
     * BEFORE (dipakai percabangan workflow HIRA sendiri) dihitung TRANSIENT
     * di submitForApproval(), tidak disimpan di sini (lihat banner comment
     * hira-lifecycle.ts).
     */
    addHazardLine(hiraId: string, input: AddHiraHazardLineInput): Promise<HiraHazardLine>;
    getById(hiraId: string): Promise<{
        teamMembers: {
            id: string;
            tenantId: string;
            createdAt: Date;
            userId: string;
            roleInTeam: string | null;
            hiraId: string;
        }[];
        hazardLines: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            existingControls: string | null;
            responsibleUserId: string | null;
            hiraId: string;
            hazardId: string | null;
            hazardDescriptionFreetext: string | null;
            likelihoodBefore: number;
            severityBefore: number;
            riskScoreBefore: number;
            riskLevelBefore: string;
            additionalControlsRequired: string | null;
            controlHierarchy: import("@prisma/client").$Enums.ControlHierarchy | null;
            likelihoodAfter: number;
            severityAfter: number;
            riskScoreAfter: number;
            riskLevelAfter: string;
            requiresEscalation: boolean;
            targetCompletionDate: Date | null;
        }[];
    } & {
        status: import("@prisma/client").$Enums.HiraAssessmentStatus;
        id: string;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        departmentId: string | null;
        siteId: string;
        deletedAt: Date | null;
        workflowInstanceId: string | null;
        assessmentType: import("@prisma/client").$Enums.HiraAssessmentType;
        assessmentDate: Date;
        reviewReminderSentAt: Date | null;
        hiraNumber: string;
        activityDescription: string;
        riskMatrixConfigId: string;
        reviewDueDate: Date | null;
    }>;
    /**
     * PRD §4.1 poin 2/3 — submit memicu workflow_instances (module_code=RISK,
     * entity_type=hira_assessment). BR-02 ditegakkan DI SINI (SEBELUM submit,
     * bukan di listener) — assessment yang tidak lengkap tidak boleh MASUK
     * approval sama sekali. Percabangan kondisional: contextData.hasExtremeHazard
     * dihitung dari risk_level_BEFORE tiap baris (lookup FRESH ke
     * risk_matrix_cells, BUKAN baca kolom requiresEscalation tersimpan yang
     * merepresentasikan AFTER — lihat banner comment hira-lifecycle.ts) —
     * SEBELUM startInstance(), dibaca WorkflowEngineService.evaluateTransitionInTx()
     * (0.9) saat stage 2 selesai.
     *
     * TIGA transaksi TERPISAH, alasan PERSIS DocumentVersionService.submitForApproval()
     * (2.1)/ComplianceEvaluationService.submitForApproval() (2.2) — lihat
     * banner comment method itu.
     */
    submitForApproval(hiraId: string): Promise<HiraAssessment>;
}
