import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { ProperSelfAssessmentService } from "./proper-self-assessment.service";

const PROPER_ASSESSMENT_WORKFLOW_ENTITY_TYPE = "proper_self_assessment";

/**
 * Task 5.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * proper_self_assessment (workflow ENV_PROPER_ASSESSMENT 2-stage). Payload-only,
 * pola PERSIS listener domain lain. APPROVED -> tutup workflow_instance_id
 * (submission_status sudah INTERNAL_REVIEWED sejak submit, lihat banner
 * comment ProperSelfAssessmentService). REJECTED -> kembali DRAFT.
 */
@Injectable()
export class ProperAssessmentWorkflowCompletionListener {
  private readonly logger = new Logger(ProperAssessmentWorkflowCompletionListener.name);

  constructor(private readonly properSelfAssessmentService: ProperSelfAssessmentService) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== PROPER_ASSESSMENT_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          await this.properSelfAssessmentService.markInternalReviewApproved(payload.entityId);
        } else if (payload.status === "REJECTED") {
          await this.properSelfAssessmentService.returnToDraft(payload.entityId);
        }
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk proper_self_assessment=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }
}
