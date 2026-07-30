import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationService } from "../../../../platform/notification/notification.service";
import { tenantContextStorage } from "../../../../platform/tenancy/tenant-context";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../../platform/workflow-engine/workflow-engine-events";
import { validateHiradcRecordStatusTransition } from "./hiradc-lifecycle";

const HIRADC_WORKFLOW_ENTITY_TYPE = "hiradc_record";

/**
 * Task 3.2 — KONSUMEN KELIMA WORKFLOW_INSTANCE_COMPLETED_EVENT. Workflow
 * instance APPROVED -> hiradc_records.status = VERIFIED (BUKAN APPROVED —
 * stage tunggalnya bernama "Verifikasi Supervisor", PRD §4.3 poin 2, jalur
 * workflow ini merealisasikan VERIFIKASI, bukan approval final; VERIFIED->APPROVED
 * lapis opsional terpisah lewat HiradcRecordService.approve(), TANPA
 * workflow tambahan). REJECTED -> status TETAP DRAFT, null-kan
 * workflowInstanceId supaya bisa diajukan verifikasi ulang (pola PERSIS
 * JsaWorkflowCompletionListener).
 */
@Injectable()
export class HiradcWorkflowCompletionListener {
  private readonly logger = new Logger(HiradcWorkflowCompletionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== HIRADC_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          await this.markVerified(payload.entityId);
        } else if (payload.status === "REJECTED") {
          await this.resetForResubmission(payload.entityId);
        }
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk hiradc_record=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }

  private async markVerified(hiradcId: string): Promise<void> {
    await this.prisma.withRls(async (tx) => {
      const hiradc = await tx.hiradcRecord.findUniqueOrThrow({ where: { id: hiradcId } });
      validateHiradcRecordStatusTransition(hiradc.status, "VERIFIED");
      await tx.hiradcRecord.update({ where: { id: hiradcId }, data: { status: "VERIFIED" } });
    });
  }

  private async resetForResubmission(hiradcId: string): Promise<void> {
    const { performedBy, hiradcNumber } = await this.prisma.withRls(async (tx) => {
      const updated = await tx.hiradcRecord.update({ where: { id: hiradcId }, data: { workflowInstanceId: null } });
      return { performedBy: updated.performedBy, hiradcNumber: updated.hiradcNumber };
    });

    await this.notificationService.enqueue({
      eventType: "HIRADC_REJECTED",
      entityType: "HIRADC_RECORD",
      entityId: hiradcId,
      recipientUserId: performedBy,
      priority: "MEDIUM",
      eventCategory: "RISK",
      variables: { hiradcNumber },
    });
  }
}
