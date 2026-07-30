import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationService } from "../../../../platform/notification/notification.service";
import { tenantContextStorage } from "../../../../platform/tenancy/tenant-context";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../../platform/workflow-engine/workflow-engine-events";
import { validateHiraAssessmentStatusTransition } from "./hira-lifecycle";

const HIRA_WORKFLOW_ENTITY_TYPE = "hira_assessment";

/**
 * Task 3.2 — KONSUMEN KETIGA WORKFLOW_INSTANCE_COMPLETED_EVENT (pola PERSIS
 * DocumentWorkflowCompletionListener 2.1/ComplianceEvaluationWorkflowCompletionListener
 * 2.2 — lihat banner comment 2.1 utk rationale race-condition lengkap,
 * TIDAK diulang di sini; payload event sendiri yang dipakai, TIDAK PERNAH
 * re-query workflow_instances/workflow_tasks). APPROVED (baik lewat 2
 * stage MAUPUN 3 stage percabangan EXTREME — listener ini TIDAK PEDULI
 * berapa stage yang dilalui, cuma peduli status FINAL instance) ->
 * IN_REVIEW->APPROVED->ACTIVE SATU TRANSAKSI (APPROVED TIDAK PERNAH
 * ditulis persisten, pola PERSIS DocumentVersionStatus APPROVED->PUBLISHED
 * 2.1). REJECTED -> IN_REVIEW->REQUIRES_REVISION (BUKAN DRAFT literal,
 * status TERSENDIRI yang FUNGSINYA "kembali ke siklus DRAFT" — lihat
 * banner comment hira-lifecycle.ts).
 */
@Injectable()
export class HiraWorkflowCompletionListener {
  private readonly logger = new Logger(HiraWorkflowCompletionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== HIRA_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          await this.activate(payload.entityId);
        } else if (payload.status === "REJECTED") {
          await this.requireRevision(payload.entityId);
        }
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk hira_assessment=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }

  private async activate(hiraId: string): Promise<void> {
    await this.prisma.withRls(async (tx) => {
      const hira = await tx.hiraAssessment.findUniqueOrThrow({ where: { id: hiraId } });
      validateHiraAssessmentStatusTransition(hira.status, "APPROVED");
      validateHiraAssessmentStatusTransition("APPROVED", "ACTIVE");
      await tx.hiraAssessment.update({ where: { id: hiraId }, data: { status: "ACTIVE" } });
    });
  }

  private async requireRevision(hiraId: string): Promise<void> {
    const { createdBy, hiraNumber } = await this.prisma.withRls(async (tx) => {
      const hira = await tx.hiraAssessment.findUniqueOrThrow({ where: { id: hiraId } });
      validateHiraAssessmentStatusTransition(hira.status, "REQUIRES_REVISION");
      const updated = await tx.hiraAssessment.update({ where: { id: hiraId }, data: { status: "REQUIRES_REVISION" } });
      return { createdBy: updated.createdBy, hiraNumber: updated.hiraNumber };
    });

    await this.notificationService.enqueue({
      eventType: "HIRA_REQUIRES_REVISION",
      entityType: "HIRA_ASSESSMENT",
      entityId: hiraId,
      recipientUserId: createdBy,
      priority: "MEDIUM",
      eventCategory: "RISK",
      variables: { hiraNumber },
    });
  }
}
