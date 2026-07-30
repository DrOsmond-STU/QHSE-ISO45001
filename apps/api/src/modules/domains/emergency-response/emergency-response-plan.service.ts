import { Injectable } from "@nestjs/common";
import { EmergencyPlanReviewFrequency, EmergencyPlanSeverityLevel, EmergencyResponsePlan, EmergencyType, ErtRole, Prisma } from "@prisma/client";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { requireActorUserId, requireTenantId } from "./emergency-response-context";
import { computeNextReviewDueDate, validateEmergencyResponsePlanStatusTransition } from "./emergency-response-plan-lifecycle";
import { EmergencyResponseWorkflowBootstrapService } from "./emergency-response-workflow-bootstrap.service";

const EMERGENCY_RESPONSE_PLAN_WORKFLOW_ENTITY_TYPE = "emergency_response_plan";

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

// Task 3.7 (Modul 14 §4.1/§6 BR-01/BR-09). BELUM ada controller HTTP.
// plan_steps DIKELOLA DI SINI (bukan service terpisah) — pola PERSIS
// InspectionChecklistTemplateService item handling (3.6): tidak py siklus
// hidup independen dari plan induknya.
@Injectable()
export class EmergencyResponsePlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: NumberingService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly bootstrapService: EmergencyResponseWorkflowBootstrapService,
  ) {}

  async create(input: CreateEmergencyResponsePlanInput): Promise<EmergencyResponsePlan> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    await this.bootstrapService.ensurePlanNumberingConfig(input.siteId);
    const site = await this.prisma.withRls((tx) =>
      tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }),
    );
    const planNumber = await this.numberingService.generateNext("EMERGENCY_PLAN", {
      scopeId: input.siteId,
      variables: { SITE_CODE: site.siteCode },
    });

    return this.prisma.withRls(async (tx) => {
      const plan = await tx.emergencyResponsePlan.create({
        data: {
          tenantId,
          companyId: input.companyId,
          branchId: input.branchId,
          siteId: input.siteId,
          planNumber,
          planTitle: input.planTitle,
          emergencyType: input.emergencyType,
          scenarioDescription: input.scenarioDescription,
          defaultMusterPointId: input.defaultMusterPointId,
          relatedDocumentId: input.relatedDocumentId,
          severityLevel: input.severityLevel,
          reviewFrequency: input.reviewFrequency ?? "ANNUAL",
          effectiveDate: input.effectiveDate,
          status: "DRAFT",
          createdBy,
          updatedBy: createdBy,
        },
      });
      await this.createSteps(tx, tenantId, plan.id, input.steps, createdBy);
      return plan;
    });
  }

  private async createSteps(
    tx: Prisma.TransactionClient,
    tenantId: string,
    planId: string,
    steps: CreateEmergencyResponsePlanStepInput[],
    createdBy: string,
  ): Promise<void> {
    if (steps.length === 0) return;
    await tx.emergencyResponsePlanStep.createMany({
      data: steps.map((step) => ({
        tenantId,
        emergencyResponsePlanId: planId,
        sequenceNo: step.sequenceNo,
        stepDescription: step.stepDescription,
        responsibleErtRole: step.responsibleErtRole,
        maxTimeTargetMinutes: step.maxTimeTargetMinutes,
        createdBy,
        updatedBy: createdBy,
      })),
    });
  }

  /**
   * PRD §4.1 poin 2 — module_code=EMERGENCY_PLAN, 2-stage kondisional
   * (KELIMA JSON Logic condition codebase ini). contextData.severityLevel
   * diisi FRESH dari baris plan itu sendiri SEBELUM startInstance() — pola
   * sama seluruh precedent conditional workflow (WorkflowEngineService
   * TIDAK PERNAH fetch data domain sendiri).
   */
  async submitForApproval(emergencyResponsePlanId: string): Promise<EmergencyResponsePlan> {
    const actorId = requireActorUserId();

    const plan = await this.prisma.withRls((tx) => tx.emergencyResponsePlan.findUniqueOrThrow({ where: { id: emergencyResponsePlanId } }));
    validateEmergencyResponsePlanStatusTransition(plan.status, "UNDER_REVIEW");

    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(
      EMERGENCY_RESPONSE_PLAN_WORKFLOW_ENTITY_TYPE,
      emergencyResponsePlanId,
      definition.id,
      { severityLevel: plan.severityLevel },
    );

    return this.prisma.withRls((tx) =>
      tx.emergencyResponsePlan.update({
        where: { id: emergencyResponsePlanId },
        data: { status: "UNDER_REVIEW", workflowInstanceId: instance.id, updatedBy: actorId },
      }),
    );
  }

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
  async markApprovedActive(emergencyResponsePlanId: string): Promise<EmergencyResponsePlan> {
    return this.prisma.withRls(async (tx) => {
      const plan = await tx.emergencyResponsePlan.findUniqueOrThrow({ where: { id: emergencyResponsePlanId } });
      validateEmergencyResponsePlanStatusTransition(plan.status, "APPROVED_ACTIVE");
      const baseline = plan.effectiveDate ?? new Date();
      return tx.emergencyResponsePlan.update({
        where: { id: emergencyResponsePlanId },
        data: {
          status: "APPROVED_ACTIVE",
          approvedAt: new Date(),
          lastReviewedDate: baseline,
          nextReviewDueDate: computeNextReviewDueDate(baseline, plan.reviewFrequency),
        },
      });
    });
  }

  /** Jalur REJECTED (listener) — enum tidak py nilai REJECTED/RETURNED,
   * plan kembali DRAFT utk direvisi+diajukan ulang, workflow_instance_id
   * di-null-kan (unique constraint izin banyak NULL, pola sama JSA 3.2).
   * `updatedBy` SENGAJA TIDAK disentuh (pola PERSIS
   * IncidentWorkflowCompletionListener.markReturned() — alasan SAMA
   * dgn banner comment markApprovedActive() di atas: tidak ada identitas
   * aktor di payload event, kolom dibiarkan pada nilai TERAKHIR yang
   * genuinely valid drpd ditimpa nilai tebakan). */
  async returnToDraft(emergencyResponsePlanId: string): Promise<EmergencyResponsePlan> {
    return this.prisma.withRls(async (tx) => {
      const plan = await tx.emergencyResponsePlan.findUniqueOrThrow({ where: { id: emergencyResponsePlanId } });
      validateEmergencyResponsePlanStatusTransition(plan.status, "DRAFT");
      return tx.emergencyResponsePlan.update({
        where: { id: emergencyResponsePlanId },
        data: { status: "DRAFT", workflowInstanceId: null },
      });
    });
  }

  async supersede(emergencyResponsePlanId: string): Promise<EmergencyResponsePlan> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const plan = await tx.emergencyResponsePlan.findUniqueOrThrow({ where: { id: emergencyResponsePlanId } });
      validateEmergencyResponsePlanStatusTransition(plan.status, "SUPERSEDED");
      return tx.emergencyResponsePlan.update({ where: { id: emergencyResponsePlanId }, data: { status: "SUPERSEDED", updatedBy } });
    });
  }

  async archive(emergencyResponsePlanId: string): Promise<EmergencyResponsePlan> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const plan = await tx.emergencyResponsePlan.findUniqueOrThrow({ where: { id: emergencyResponsePlanId } });
      validateEmergencyResponsePlanStatusTransition(plan.status, "ARCHIVED");
      return tx.emergencyResponsePlan.update({ where: { id: emergencyResponsePlanId }, data: { status: "ARCHIVED", updatedBy } });
    });
  }

  async getById(emergencyResponsePlanId: string) {
    return this.prisma.withRls((tx) =>
      tx.emergencyResponsePlan.findUniqueOrThrow({ where: { id: emergencyResponsePlanId }, include: { planSteps: { orderBy: { sequenceNo: "asc" } } } }),
    );
  }

  async listActiveBySite(siteId: string): Promise<EmergencyResponsePlan[]> {
    return this.prisma.withRls((tx) =>
      tx.emergencyResponsePlan.findMany({ where: { siteId, status: "APPROVED_ACTIVE", deletedAt: null }, orderBy: { planTitle: "asc" } }),
    );
  }
}
