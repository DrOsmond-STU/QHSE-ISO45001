import { EmergencyPlanReviewFrequency, EmergencyPlanSeverityLevel, EmergencyResponsePlan, EmergencyType, ErtRole } from "@prisma/client";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { EmergencyResponseWorkflowBootstrapService } from "./emergency-response-workflow-bootstrap.service";
export interface CreateEmergencyResponsePlanStepInput {
    sequenceNo: number;
    stepDescription: string;
    responsibleErtRole?: ErtRole;
    maxTimeTargetMinutes?: number;
}
export interface CreateEmergencyResponsePlanInput {
    companyId: string;
    branchId?: string;
    siteId: string;
    planTitle: string;
    emergencyType: EmergencyType;
    scenarioDescription: string;
    defaultMusterPointId?: string;
    relatedDocumentId?: string;
    severityLevel: EmergencyPlanSeverityLevel;
    reviewFrequency?: EmergencyPlanReviewFrequency;
    effectiveDate?: Date;
    steps: CreateEmergencyResponsePlanStepInput[];
}
export declare class EmergencyResponsePlanService {
    private readonly prisma;
    private readonly numberingService;
    private readonly workflowEngineService;
    private readonly bootstrapService;
    constructor(prisma: PrismaService, numberingService: NumberingService, workflowEngineService: WorkflowEngineService, bootstrapService: EmergencyResponseWorkflowBootstrapService);
    create(input: CreateEmergencyResponsePlanInput): Promise<EmergencyResponsePlan>;
    private createSteps;
    /**
     * PRD §4.1 poin 2 — module_code=EMERGENCY_PLAN, 2-stage kondisional
     * (KELIMA JSON Logic condition codebase ini). contextData.severityLevel
     * diisi FRESH dari baris plan itu sendiri SEBELUM startInstance() — pola
     * sama seluruh precedent conditional workflow (WorkflowEngineService
     * TIDAK PERNAH fetch data domain sendiri).
     */
    submitForApproval(emergencyResponsePlanId: string): Promise<EmergencyResponsePlan>;
    /**
     * BR-01 — "next_review_due_date" dihitung SAAT PERTAMA KALI plan
     * genuinely APPROVED_ACTIVE. Dipanggil listener
     * (EmergencyResponseWorkflowCompletionListener), BUKAN caller langsung.
     *
     * `approved_by` SENGAJA DIBIARKAN NULL DI SINI — `WorkflowInstanceCompletedEvent`
     * (workflow-engine-events.ts) TIDAK membawa identitas aktor SAMA SEKALI
     * (hanya instanceId/tenantId/status/entityType/entityId), dan banner
     * comment event itu SENDIRI eksplisit MELARANG listener re-query
     * `workflow_tasks` (utk membaca `acted_by` task terakhir) krn race
     * condition pre-commit yang SAMA (event di-emit DI DALAM transaksi
     * `actOnTask()` SEBELUM commit, terverifikasi 21/30 percobaan baca STALE)
     * — memaksa isi approved_by di sini beresiko salah/stale, jadi TIDAK
     * diisi sama sekali drpd menebak. Jejak SIAPA yang approve tetap
     * terekam via `audit_log_trigger` generik pada baris `workflow_tasks`
     * itu sendiri (`acted_by` KOLOM AUDIT-nya, bukan kolom domain ini). Gap
     * TDD §26.
     */
    markApprovedActive(emergencyResponsePlanId: string): Promise<EmergencyResponsePlan>;
    /** Jalur REJECTED (listener) — enum tidak py nilai REJECTED/RETURNED,
     * plan kembali DRAFT utk direvisi+diajukan ulang, workflow_instance_id
     * di-null-kan (unique constraint izin banyak NULL, pola sama JSA 3.2).
     * `updatedBy` SENGAJA TIDAK disentuh (pola PERSIS
     * IncidentWorkflowCompletionListener.markReturned() — alasan SAMA
     * dgn banner comment markApprovedActive() di atas: tidak ada identitas
     * aktor di payload event, kolom dibiarkan pada nilai TERAKHIR yang
     * genuinely valid drpd ditimpa nilai tebakan). */
    returnToDraft(emergencyResponsePlanId: string): Promise<EmergencyResponsePlan>;
    supersede(emergencyResponsePlanId: string): Promise<EmergencyResponsePlan>;
    archive(emergencyResponsePlanId: string): Promise<EmergencyResponsePlan>;
    getById(emergencyResponsePlanId: string): Promise<{
        planSteps: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            sequenceNo: number;
            emergencyResponsePlanId: string;
            stepDescription: string;
            responsibleErtRole: import("@prisma/client").$Enums.ErtRole | null;
            maxTimeTargetMinutes: number | null;
        }[];
    } & {
        version: number;
        status: import("@prisma/client").$Enums.EmergencyPlanStatus;
        id: string;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        siteId: string;
        deletedAt: Date | null;
        companyId: string;
        branchId: string | null;
        workflowInstanceId: string | null;
        approvedBy: string | null;
        approvedAt: Date | null;
        reviewedBy: string | null;
        severityLevel: import("@prisma/client").$Enums.EmergencyPlanSeverityLevel;
        effectiveDate: Date | null;
        emergencyType: import("@prisma/client").$Enums.EmergencyType;
        planNumber: string;
        planTitle: string;
        scenarioDescription: string;
        defaultMusterPointId: string | null;
        relatedDocumentId: string | null;
        reviewFrequency: import("@prisma/client").$Enums.EmergencyPlanReviewFrequency;
        lastReviewedDate: Date | null;
        nextReviewDueDate: Date | null;
    }>;
    listActiveBySite(siteId: string): Promise<EmergencyResponsePlan[]>;
}
