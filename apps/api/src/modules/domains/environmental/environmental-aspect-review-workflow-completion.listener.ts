import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { EnvironmentalAspectImpactService } from "./environmental-aspect-impact.service";

const ASPECT_REVIEW_WORKFLOW_ENTITY_TYPE = "environmental_aspect_impact";

/**
 * Task 5.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * environmental_aspect_impact (workflow ENV_ASPECT_REVIEW 2-stage). Payload-only,
 * pola PERSIS NcrWorkflowCompletionListener 5.1. APPROVED -> UNDER_REVIEW->ACTIVE
 * (BR-01 ditegakkan di markApproved()). REJECTED -> kembali DRAFT.
 */
@Injectable()
export class EnvironmentalAspectReviewWorkflowCompletionListener {
  private readonly logger = new Logger(EnvironmentalAspectReviewWorkflowCompletionListener.name);

  constructor(private readonly aspectImpactService: EnvironmentalAspectImpactService) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== ASPECT_REVIEW_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          await this.aspectImpactService.markApproved(payload.entityId);
        } else if (payload.status === "REJECTED") {
          await this.aspectImpactService.returnToDraft(payload.entityId);
        }
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk environmental_aspect_impact=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }
}
