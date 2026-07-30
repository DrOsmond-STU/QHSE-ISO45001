import { Injectable } from "@nestjs/common";
import { CapaActionPlan, CapaActionType, CapaRegister } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { requireActorUserId, requireTenantId } from "./capa-context";
import { assertActionTrackingIdRequired } from "./capa-action-plan-rules";
import { validateCapaRegisterStatusTransition } from "./capa-register-lifecycle";
import { CapaWorkflowBootstrapService } from "./capa-workflow-bootstrap.service";
import { CapaRegisterService } from "./capa-register.service";
import { CapaApprovalCacheService } from "./capa-approval-cache.service";

// PRD §4 poin 5 literal "entity_type=capa_action_plan" — TAPI entityId DI
// SINI adalah capa_register.id, BUKAN baris capa_action_plans manapun
// (deviasi SADAR dari konvensi "entity_type namai tabel target LANGSUNG"
// dipakai modul lain, mis. DMS document_version/Audit audit_report) —
// SATU submission mencakup SELURUH capa_action_plans milik CAPA itu
// (bisa >1 baris), TIDAK ADA satu baris tunggal yang representatif utk
// dijadikan entityId, sementara capa_register.status/workflow_instance_id
// (kolom TUNGGAL) SENDIRI yang genuinely berubah per submission — BR-08
// juga berbunyi singular "capa_register.status berpindah dari
// ACTION_PLAN_DEFINED ke PENDING_APPROVAL", bukan per-action-plan.
const CAPA_ACTION_PLAN_WORKFLOW_ENTITY_TYPE = "capa_action_plan";

export interface DefineCapaActionPlanInput {
  capaRegisterId: string;
  rootCauseAnalysisId?: string;
  actionDescription: string;
  justification: string;
  actionType: CapaActionType;
  picUserId: string;
  dueDate: Date;
}

/**
 * Task 4.2 (Modul 10 §4 poin 4-5, §3 "CAPA Owner/PIC | capa.action_plan.define,
 * capa.action_plan.link_action_tracking"). BELUM ada controller HTTP.
 */
@Injectable()
export class CapaActionPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bootstrapService: CapaWorkflowBootstrapService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly registerService: CapaRegisterService,
    private readonly approvalCacheService: CapaApprovalCacheService,
  ) {}

  async define(input: DefineCapaActionPlanInput): Promise<CapaActionPlan> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    await this.markActionPlanDefined(input.capaRegisterId, createdBy);

    return this.prisma.withRls((tx) =>
      tx.capaActionPlan.create({
        data: {
          tenantId,
          capaRegisterId: input.capaRegisterId,
          rootCauseAnalysisId: input.rootCauseAnalysisId,
          actionDescription: input.actionDescription,
          justification: input.justification,
          actionType: input.actionType,
          picUserId: input.picUserId,
          dueDate: input.dueDate,
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  private async markActionPlanDefined(capaRegisterId: string, actorId: string): Promise<void> {
    const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId } }));
    if (capa.status === "ACTION_PLAN_DEFINED") return;
    validateCapaRegisterStatusTransition(capa.status, "ACTION_PLAN_DEFINED");
    await this.prisma.withRls((tx) =>
      tx.capaRegister.update({ where: { id: capaRegisterId }, data: { status: "ACTION_PLAN_DEFINED", updatedBy: actorId } }),
    );
  }

  // Modul 24 (Action Tracking) BELUM ADA (Phase 7) — titik sinkronisasi
  // MANUAL, pola sama InspectionFindingService.linkActionTracking() (3.6).
  async setActionTrackingId(capaActionPlanId: string, actionTrackingId: string): Promise<CapaActionPlan> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.capaActionPlan.update({ where: { id: capaActionPlanId }, data: { actionTrackingId, updatedBy } }),
    );
  }

  // Modul 24 sync point utk status_cache/completed_date_cache — event-driven
  // MASA DEPAN, manual sekarang (PRD §5 "disinkronkan via event" literal,
  // TIDAK ADA event sungguhan krn Modul 24 belum ada, gap TDD §26).
  async updateStatusCache(capaActionPlanId: string, statusCache: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE", completedDate?: Date): Promise<CapaActionPlan> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.capaActionPlan.update({
        where: { id: capaActionPlanId },
        data: { statusCache, completedDateCache: completedDate, updatedBy },
      }),
    );
  }

  // BR-08 gate SEBELUM submit.
  async submitForApproval(capaRegisterId: string): Promise<CapaRegister> {
    const actorId = requireActorUserId();

    const capa = await this.prisma.withRls((tx) =>
      tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId }, include: { actionPlans: true } }),
    );
    if (capa.workflowInstanceId) {
      throw new Error("capa_register sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
    }
    assertActionTrackingIdRequired(capa.actionPlans.map((p) => ({ id: p.id, actionTrackingId: p.actionTrackingId })));

    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureActionPlanWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(
      CAPA_ACTION_PLAN_WORKFLOW_ENTITY_TYPE,
      capaRegisterId,
      definition.id,
      {},
    );

    validateCapaRegisterStatusTransition(capa.status, "PENDING_APPROVAL");
    const updated = await this.prisma.withRls((tx) =>
      tx.capaRegister.update({
        where: { id: capaRegisterId },
        data: { status: "PENDING_APPROVAL", workflowInstanceId: instance.id, updatedBy: actorId },
      }),
    );
    await this.approvalCacheService.refresh(capaRegisterId, instance.id, "Action Plan Approval");
    return updated;
  }

  async getById(capaActionPlanId: string): Promise<CapaActionPlan> {
    return this.prisma.withRls((tx) => tx.capaActionPlan.findUniqueOrThrow({ where: { id: capaActionPlanId } }));
  }

  async listByCapa(capaRegisterId: string): Promise<CapaActionPlan[]> {
    return this.prisma.withRls((tx) =>
      tx.capaActionPlan.findMany({ where: { capaRegisterId, deletedAt: null }, orderBy: { dueDate: "asc" } }),
    );
  }
}
