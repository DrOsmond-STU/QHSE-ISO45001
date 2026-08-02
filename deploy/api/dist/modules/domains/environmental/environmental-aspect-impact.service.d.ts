import { EnvConditionType, EnvImpactType, EnvironmentalAspectImpact, EnvLifeCycleStage, Prisma } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { AspectImpactScores } from "./aspect-impact-lifecycle";
import { EnvironmentalWorkflowBootstrapService } from "./environmental-workflow-bootstrap.service";
export interface CreateAspectImpactInput {
    companyId: string;
    branchId?: string;
    siteId: string;
    departmentId?: string;
    lifeCycleStage?: EnvLifeCycleStage;
    conditionType: EnvConditionType;
    activityProcessArea: string;
    environmentalAspect: string;
    environmentalImpact: string;
    impactType: EnvImpactType;
    scores: AspectImpactScores;
    scoringWeightDetail?: Prisma.InputJsonValue;
    significanceThreshold?: number;
    existingControls?: string;
    isRegulated?: boolean;
    relatedPermitId?: string;
}
/**
 * Task 5.2 (Modul 12 §4.1, §3 "Environmental Officer | environmental.aspect_impact.create",
 * "HSE Manager | environmental.aspect_impact.approve"). BELUM ada
 * controller HTTP. CAPA-linkage (BR-01, `capa_id`) TETAP MANUAL — caller
 * wajib `CapaRegisterService.create({sourceType:"ENVIRONMENTAL_ASPECT_IMPACT",...})`
 * SENDIRI dulu baru `linkCapaRegister()`, pola sama Quality 5.1.
 */
export declare class EnvironmentalAspectImpactService {
    private readonly prisma;
    private readonly numberingService;
    private readonly bootstrapService;
    private readonly workflowEngineService;
    private readonly notificationService;
    constructor(prisma: PrismaService, numberingService: NumberingService, bootstrapService: EnvironmentalWorkflowBootstrapService, workflowEngineService: WorkflowEngineService, notificationService: NotificationService);
    create(input: CreateAspectImpactInput): Promise<EnvironmentalAspectImpact>;
    /** DRAFT->UNDER_REVIEW, submit workflow ENV_ASPECT_REVIEW 2-stage. */
    submitForReview(aspectImpactId: string): Promise<EnvironmentalAspectImpact>;
    /** Dipanggil EnvironmentalAspectReviewWorkflowCompletionListener saat workflow APPROVED. BR-01 ditegakkan di sini. */
    markApproved(aspectImpactId: string): Promise<EnvironmentalAspectImpact>;
    /** Dipanggil listener saat workflow REJECTED — kembali DRAFT utk revisi. */
    returnToDraft(aspectImpactId: string): Promise<EnvironmentalAspectImpact>;
    /** BR-01 — manual link, lihat banner comment kelas ini. */
    linkCapaRegister(aspectImpactId: string, capaRegisterId: string): Promise<EnvironmentalAspectImpact>;
    getById(aspectImpactId: string): Promise<EnvironmentalAspectImpact>;
    listBySite(siteId: string): Promise<EnvironmentalAspectImpact[]>;
}
