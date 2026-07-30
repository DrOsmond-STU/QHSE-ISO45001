import { Injectable } from "@nestjs/common";
import { EnvConditionType, EnvImpactType, EnvironmentalAspectImpact, EnvLifeCycleStage, Prisma } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { requireActorUserId, requireTenantId } from "./environmental-context";
import {
  AspectImpactScores,
  assertControlsAdequateForActive,
  calculateSignificanceScore,
  deriveSignificanceLevel,
  validateAspectImpactStatusTransition,
} from "./aspect-impact-lifecycle";
import { EnvironmentalWorkflowBootstrapService } from "./environmental-workflow-bootstrap.service";

const ASPECT_NUMBERING_MODULE_CODE = "ENV_ASPECT";
const ASPECT_REVIEW_WORKFLOW_ENTITY_TYPE = "environmental_aspect_impact";

// PRD §5 literal significance_threshold "default per tenant" — TIDAK ADA
// tabel konfigurasi tenant-wide utk default ini (§13 poin 1 sendiri
// mengakui "Phase 1 cukup field manual per record") — dipakai sbg fallback
// kalau caller tidak menyuplai threshold eksplisit. Skala rata-rata 5
// skor 1-5, titik tengah dipilih (bukan angka literal PRD), gap TDD §26.
const DEFAULT_SIGNIFICANCE_THRESHOLD = 3.5;

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
@Injectable()
export class EnvironmentalAspectImpactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: NumberingService,
    private readonly bootstrapService: EnvironmentalWorkflowBootstrapService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(input: CreateAspectImpactInput): Promise<EnvironmentalAspectImpact> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    await this.bootstrapService.ensureAspectNumberingConfig(input.siteId);
    const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
    const registerNumber = await this.numberingService.generateNext(ASPECT_NUMBERING_MODULE_CODE, {
      scopeId: input.siteId,
      variables: { SITE_CODE: site.siteCode },
    });

    const significanceScore = calculateSignificanceScore(input.scores);
    const significanceThreshold = input.significanceThreshold ?? DEFAULT_SIGNIFICANCE_THRESHOLD;
    const significanceLevel = deriveSignificanceLevel(significanceScore, significanceThreshold);

    const aspect = await this.prisma.withRls((tx) =>
      tx.environmentalAspectImpact.create({
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
      }),
    );

    // PRD §8 "aspek signifikan tanpa CAPA/kontrol memadai | HSE Manager |
    // In-app" — dipicu SAAT create() BILA SIGNIFICANT tanpa existing_controls
    // (interpretasi: dicek di titik SAMA BR-01 dievaluasi nanti di
    // markApproved(), bukan scan job terjadwal — PRD tidak beri timing
    // eksplisit "kapan" notifikasi ini terkirim), gap TDD §26.
    if (significanceLevel === "SIGNIFICANT" && !input.existingControls) {
      const recipients = await this.prisma.withRls((tx) =>
        tx.user.findMany({ where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } }, select: { id: true } }),
      );
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
  async submitForReview(aspectImpactId: string): Promise<EnvironmentalAspectImpact> {
    const actorId = requireActorUserId();
    const aspect = await this.prisma.withRls((tx) => tx.environmentalAspectImpact.findUniqueOrThrow({ where: { id: aspectImpactId } }));
    if (aspect.workflowInstanceId) {
      throw new Error("environmental_aspects_impacts sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
    }
    validateAspectImpactStatusTransition(aspect.status, "UNDER_REVIEW");

    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureAspectReviewWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(ASPECT_REVIEW_WORKFLOW_ENTITY_TYPE, aspectImpactId, definition.id, {});

    return this.prisma.withRls((tx) =>
      tx.environmentalAspectImpact.update({
        where: { id: aspectImpactId },
        data: { status: "UNDER_REVIEW", workflowInstanceId: instance.id, updatedBy: actorId },
      }),
    );
  }

  /** Dipanggil EnvironmentalAspectReviewWorkflowCompletionListener saat workflow APPROVED. BR-01 ditegakkan di sini. */
  async markApproved(aspectImpactId: string): Promise<EnvironmentalAspectImpact> {
    const aspect = await this.prisma.withRls((tx) => tx.environmentalAspectImpact.findUniqueOrThrow({ where: { id: aspectImpactId } }));
    validateAspectImpactStatusTransition(aspect.status, "ACTIVE");
    assertControlsAdequateForActive(aspect.significanceLevel, aspect.existingControls, aspect.capaRegisterId);

    const nextReviewDate = new Date();
    nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 1);

    return this.prisma.withRls((tx) =>
      tx.environmentalAspectImpact.update({
        where: { id: aspectImpactId },
        data: { status: "ACTIVE", reviewDate: new Date(), nextReviewDate, workflowInstanceId: null },
      }),
    );
  }

  /** Dipanggil listener saat workflow REJECTED — kembali DRAFT utk revisi. */
  async returnToDraft(aspectImpactId: string): Promise<EnvironmentalAspectImpact> {
    return this.prisma.withRls((tx) =>
      tx.environmentalAspectImpact.update({ where: { id: aspectImpactId }, data: { status: "DRAFT", workflowInstanceId: null } }),
    );
  }

  /** BR-01 — manual link, lihat banner comment kelas ini. */
  async linkCapaRegister(aspectImpactId: string, capaRegisterId: string): Promise<EnvironmentalAspectImpact> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.environmentalAspectImpact.update({ where: { id: aspectImpactId }, data: { capaRegisterId, updatedBy } }),
    );
  }

  async getById(aspectImpactId: string): Promise<EnvironmentalAspectImpact> {
    return this.prisma.withRls((tx) => tx.environmentalAspectImpact.findUniqueOrThrow({ where: { id: aspectImpactId } }));
  }

  async listBySite(siteId: string): Promise<EnvironmentalAspectImpact[]> {
    return this.prisma.withRls((tx) => tx.environmentalAspectImpact.findMany({ where: { siteId }, orderBy: { createdAt: "desc" } }));
  }
}
