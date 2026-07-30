import { ForbiddenException, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma, WorkflowInstance, WorkflowTask, WorkflowTaskAction } from "@prisma/client";
import { PrismaService } from "../tenancy/prisma.service";
import { getCurrentTenantId } from "../tenancy/tenant-context";
import { ApproverResolutionService } from "./approver-resolution.service";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "./workflow-engine.constants";
import { evaluateStageCompletion, pickTransition, TransitionCandidate } from "./workflow-transition-evaluation";

// TDD §9 — state machine berbasis konfigurasi. Tiga operasi inti persis
// signature TDD: startInstance(entityType, entityId, workflowDefinitionId),
// actOnTask(taskId, action, comment), evaluateTransition(instanceId).
// TIDAK ada parameter tenantId eksplisit di method publik manapun — sama
// seperti PrismaService.withRls(), tenant SELALU ambient dari
// tenantContextStorage (di-set middleware/tenant-context sebelum controller
// domain manapun memanggil service ini). actingUserId ditambah eksplisit di
// actOnTask (dibutuhkan utk authorization + audit trail — TDD hanya
// menyebut 3 argumen inti, bukan kontrak ketat yang melarang argumen lain).

export interface ActOnTaskResult {
  alreadyProcessed: boolean;
  task: WorkflowTask;
}

function requireTenantId(): string {
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    throw new Error("Tenant context tidak ditemukan — request ditolak (fail closed).");
  }
  return tenantId;
}

@Injectable()
export class WorkflowEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approverResolutionService: ApproverResolutionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async startInstance(
    entityType: string,
    entityId: string,
    workflowDefinitionId: string,
    contextData: Record<string, unknown> = {},
  ): Promise<WorkflowInstance> {
    const tenantId = requireTenantId();

    return this.prisma.withRls(async (tx) => {
      const firstStage = await tx.workflowStage.findFirstOrThrow({
        where: { workflowDefinitionId },
        orderBy: { sequenceNo: "asc" },
      });

      const instance = await tx.workflowInstance.create({
        data: {
          tenantId,
          workflowDefinitionId,
          entityType,
          entityId,
          currentStageId: firstStage.id,
          contextData: contextData as Prisma.InputJsonValue,
          status: "IN_PROGRESS",
        },
      });

      await this.createTasksForStage(tx, instance.id, firstStage.id, tenantId, instance.contextData);

      return instance;
    });
  }

  /**
   * Idempotent thd double-submit (TDD §9): row lock (SELECT ... FOR UPDATE)
   * lalu cek status sudah bukan PENDING sebelum proses. Panggilan kedua yang
   * konkuren blok di lock sampai panggilan pertama commit, lalu baca status
   * yang sudah berubah dan no-op dengan aman.
   */
  async actOnTask(
    taskId: string,
    action: Extract<WorkflowTaskAction, "APPROVE" | "REJECT">,
    comment: string | undefined,
    actingUserId: string,
  ): Promise<ActOnTaskResult> {
    const tenantId = requireTenantId();

    return this.prisma.withRls(async (tx) => {
      // withRls() sudah SET LOCAL app.current_tenant_id di transaksi ini —
      // RLS ikut membatasi raw lock query ini juga (taskId lintas tenant
      // otomatis tidak terlihat, bukan cuma unauthorized). Prisma belum
      // punya .forUpdate() bawaan, jadi raw:
      await tx.$queryRaw`SELECT task_id FROM workflow_tasks WHERE task_id = ${taskId}::uuid FOR UPDATE`;
      const task = await tx.workflowTask.findUniqueOrThrow({ where: { id: taskId } });

      if (task.status !== "PENDING") {
        return { alreadyProcessed: true, task };
      }
      if (task.assignedTo !== actingUserId) {
        throw new ForbiddenException("Anda bukan assignee task ini.");
      }

      const updated = await tx.workflowTask.update({
        where: { id: taskId },
        data: {
          status: action === "APPROVE" ? "APPROVED" : "REJECTED",
          actedAt: new Date(),
          actedBy: actingUserId,
          comment,
        },
      });

      await this.evaluateTransitionInTx(tx, task.instanceId, tenantId);

      return { alreadyProcessed: false, task: updated };
    });
  }

  async evaluateTransition(instanceId: string): Promise<{ stageComplete: boolean }> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => this.evaluateTransitionInTx(tx, instanceId, tenantId));
  }

  private async evaluateTransitionInTx(
    tx: Prisma.TransactionClient,
    instanceId: string,
    tenantId: string,
  ): Promise<{ stageComplete: boolean }> {
    const instance = await tx.workflowInstance.findUniqueOrThrow({ where: { id: instanceId } });
    if (instance.status !== "IN_PROGRESS" || !instance.currentStageId) {
      return { stageComplete: false };
    }

    const stage = await tx.workflowStage.findUniqueOrThrow({ where: { id: instance.currentStageId } });
    const siblingTasks = await tx.workflowTask.findMany({ where: { instanceId, stageId: stage.id } });

    const completion = evaluateStageCompletion(
      siblingTasks.map((t) => t.status),
      stage.parallelCompletionRule ?? "ALL_APPROVE",
    );

    if (!completion.complete || completion.outcome === null) {
      return { stageComplete: false };
    }

    const triggerAction: WorkflowTaskAction = completion.outcome === "APPROVE" ? "APPROVE" : "REJECT";

    const transitionRows = await tx.workflowTransition.findMany({ where: { fromStageId: stage.id } });
    const candidates: TransitionCandidate[] = transitionRows.map((t) => ({
      id: t.id,
      triggerAction: t.triggerAction,
      condition: t.condition,
      priority: t.priority,
      toStageId: t.toStageId,
      resultStatus: t.resultStatus,
    }));
    const picked = pickTransition(candidates, triggerAction, (instance.contextData as Record<string, unknown>) ?? {});

    if (!picked) {
      throw new Error(
        `Tidak ada workflow_transitions yang cocok dari stage ${stage.id} untuk aksi ${triggerAction} (config workflow tidak lengkap).`,
      );
    }

    if (picked.toStageId) {
      await tx.workflowInstance.update({ where: { id: instanceId }, data: { currentStageId: picked.toStageId } });
      await this.createTasksForStage(tx, instanceId, picked.toStageId, tenantId, instance.contextData);
      return { stageComplete: true };
    }

    const finalStatus = picked.resultStatus ?? (triggerAction === "APPROVE" ? "APPROVED" : "REJECTED");
    await tx.workflowInstance.update({
      where: { id: instanceId },
      data: { status: finalStatus, completedAt: new Date(), currentStageId: null },
    });
    this.eventEmitter.emit(WORKFLOW_INSTANCE_COMPLETED_EVENT, {
      instanceId,
      tenantId,
      status: finalStatus,
      entityType: instance.entityType,
      entityId: instance.entityId,
    });
    return { stageComplete: true };
  }

  private async createTasksForStage(
    tx: Prisma.TransactionClient,
    instanceId: string,
    stageId: string,
    tenantId: string,
    contextData: Prisma.JsonValue,
  ): Promise<void> {
    const stage = await tx.workflowStage.findUniqueOrThrow({ where: { id: stageId } });
    const approverIds = await this.approverResolutionService.resolveApprovers(
      tx,
      stage,
      tenantId,
      (contextData as Record<string, unknown> | null) ?? undefined,
    );
    if (approverIds.length === 0) {
      throw new Error(`Tidak ada approver ditemukan untuk stage ${stageId} (${stage.stageName}).`);
    }
    await tx.workflowTask.createMany({
      data: approverIds.map((userId) => ({
        tenantId,
        instanceId,
        stageId,
        assignedTo: userId,
        status: "PENDING" as const,
      })),
    });
  }
}
