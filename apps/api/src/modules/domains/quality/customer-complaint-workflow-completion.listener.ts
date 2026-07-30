import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { CustomerComplaintService } from "./customer-complaint.service";

const COMPLAINT_WORKFLOW_ENTITY_TYPE = "customer_complaint";

/**
 * Task 5.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * customer_complaint. APPROVED -> markInvestigationApproved() (severity
 * HIGH/CRITICAL tanpa capa_id -> CAPA_IN_PROGRESS, selainnya -> RESOLVED
 * langsung). REJECTED -> kembali UNDER_INVESTIGATION.
 */
@Injectable()
export class CustomerComplaintWorkflowCompletionListener {
  private readonly logger = new Logger(CustomerComplaintWorkflowCompletionListener.name);

  constructor(private readonly customerComplaintService: CustomerComplaintService) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== COMPLAINT_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          await this.customerComplaintService.markInvestigationApproved(payload.entityId);
        } else if (payload.status === "REJECTED") {
          await this.customerComplaintService.returnToInvestigation(payload.entityId);
        }
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk customer_complaint=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }
}
