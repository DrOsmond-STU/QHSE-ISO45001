import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationService } from "../../../../platform/notification/notification.service";
import { tenantContextStorage } from "../../../../platform/tenancy/tenant-context";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../../platform/workflow-engine/workflow-engine-events";
import { validateJsaRecordStatusTransition } from "./jsa-lifecycle";

const JSA_WORKFLOW_ENTITY_TYPE = "jsa_record";

/**
 * Task 3.2 — KONSUMEN KEEMPAT WORKFLOW_INSTANCE_COMPLETED_EVENT (pola
 * PERSIS listener lain modul ini/2.1/2.2). APPROVED -> DRAFT->APPROVED->ACTIVE
 * SATU TRANSAKSI (APPROVED tidak pernah persisten, sama pola HIRA/DMS).
 * REJECTED -> status TETAP DRAFT (tidak pernah "keluar" dari situ, lihat
 * banner comment jsa-lifecycle.ts) — cukup null-kan workflowInstanceId
 * (unique constraint TIDAK masalah diisi ulang instance BARU saat
 * disubmit lagi) supaya JsaRecordService.submitForApproval() bisa dipanggil
 * ulang, TIDAK ADA transisi status utk divalidasi di jalur ini.
 */
@Injectable()
export class JsaWorkflowCompletionListener {
  private readonly logger = new Logger(JsaWorkflowCompletionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== JSA_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          await this.activate(payload.entityId);
        } else if (payload.status === "REJECTED") {
          await this.resetForResubmission(payload.entityId);
        }
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk jsa_record=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }

  private async activate(jsaId: string): Promise<void> {
    await this.prisma.withRls(async (tx) => {
      const jsa = await tx.jsaRecord.findUniqueOrThrow({ where: { id: jsaId } });
      validateJsaRecordStatusTransition(jsa.status, "APPROVED");
      validateJsaRecordStatusTransition("APPROVED", "ACTIVE");
      await tx.jsaRecord.update({ where: { id: jsaId }, data: { status: "ACTIVE" } });
    });
  }

  private async resetForResubmission(jsaId: string): Promise<void> {
    const { preparedBy, jsaNumber } = await this.prisma.withRls(async (tx) => {
      const updated = await tx.jsaRecord.update({ where: { id: jsaId }, data: { workflowInstanceId: null } });
      return { preparedBy: updated.preparedBy, jsaNumber: updated.jsaNumber };
    });

    await this.notificationService.enqueue({
      eventType: "JSA_REJECTED",
      entityType: "JSA_RECORD",
      entityId: jsaId,
      recipientUserId: preparedBy,
      priority: "MEDIUM",
      eventCategory: "RISK",
      variables: { jsaNumber },
    });
  }
}
