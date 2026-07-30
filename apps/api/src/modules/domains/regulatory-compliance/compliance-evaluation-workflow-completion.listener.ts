import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationService } from "../../../platform/notification/notification.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { validateComplianceEvaluationStatusTransition } from "./compliance-evaluation-lifecycle";

const COMPLIANCE_WORKFLOW_ENTITY_TYPE = "compliance_evaluation";

/**
 * Task 2.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT KEDUA (pola PERSIS
 * DocumentWorkflowCompletionListener, 2.1 — lihat banner comment file itu
 * utk rationale lengkap soal race condition emit()-sebelum-commit yang
 * SUDAH diverifikasi empiris di task 2.1, TIDAK diulang di sini). APPROVED
 * -> REVIEWED (menunggu close() eksplisit, BR-03 gate — lihat
 * ComplianceEvaluationService.close()). REJECTED -> DRAFT (BUKAN status
 * terminal terpisah — ComplianceEvaluationStatus tidak punya nilai
 * REJECTED sama sekali, beda dari DocumentVersionStatus 2.1) supaya
 * evaluator bisa revisi & submit ulang.
 */
@Injectable()
export class ComplianceEvaluationWorkflowCompletionListener {
  private readonly logger = new Logger(ComplianceEvaluationWorkflowCompletionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== COMPLIANCE_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          await this.markReviewed(payload.entityId);
        } else if (payload.status === "REJECTED") {
          await this.revertToDraft(payload.entityId);
        }
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk compliance_evaluation=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }

  private async markReviewed(evaluationId: string): Promise<void> {
    await this.prisma.withRls(async (tx) => {
      const evaluation = await tx.complianceEvaluation.findUniqueOrThrow({ where: { id: evaluationId } });
      validateComplianceEvaluationStatusTransition(evaluation.status, "REVIEWED");
      await tx.complianceEvaluation.update({ where: { id: evaluationId }, data: { status: "REVIEWED" } });
    });
  }

  private async revertToDraft(evaluationId: string): Promise<void> {
    const { evaluatorUserId, evaluationNumber } = await this.prisma.withRls(async (tx) => {
      const evaluation = await tx.complianceEvaluation.findUniqueOrThrow({ where: { id: evaluationId } });
      validateComplianceEvaluationStatusTransition(evaluation.status, "DRAFT");
      const updated = await tx.complianceEvaluation.update({ where: { id: evaluationId }, data: { status: "DRAFT" } });
      return { evaluatorUserId: updated.evaluatorUserId, evaluationNumber: updated.evaluationNumber };
    });

    await this.notificationService.enqueue({
      eventType: "COMPLIANCE_EVALUATION_REJECTED",
      entityType: "COMPLIANCE_EVALUATION",
      entityId: evaluationId,
      recipientUserId: evaluatorUserId,
      priority: "MEDIUM",
      eventCategory: "COMPLIANCE",
      variables: { evaluationNumber },
    });
  }
}
