import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { NcrRecordService } from "./ncr-record.service";

const NCR_WORKFLOW_ENTITY_TYPE = "ncr_record";

/**
 * Task 5.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * ncr_record. Payload-only (TIDAK re-query ncr_records — tidak ada data
 * tambahan yang dibutuhkan selain payload.entityId/status sendiri, pola
 * PERSIS CapaActionPlanWorkflowCompletionListener 4.2). APPROVED (SELURUH
 * 3 stage: Review Supervisor->Approval Disposisi Quality Manager->
 * Verifikasi Penutupan) -> DISPOSITION_PENDING->DISPOSITIONED. REJECTED
 * (di stage manapun) -> kembali CONTAINMENT (disposisi diajukan ulang).
 */
@Injectable()
export class NcrWorkflowCompletionListener {
  private readonly logger = new Logger(NcrWorkflowCompletionListener.name);

  constructor(private readonly ncrRecordService: NcrRecordService) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== NCR_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          await this.ncrRecordService.markDispositionApproved(payload.entityId);
        } else if (payload.status === "REJECTED") {
          await this.ncrRecordService.returnToContainment(payload.entityId);
        }
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk ncr_record=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }
}
