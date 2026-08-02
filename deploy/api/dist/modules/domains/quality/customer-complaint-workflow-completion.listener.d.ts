import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { CustomerComplaintService } from "./customer-complaint.service";
/**
 * Task 5.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * customer_complaint. APPROVED -> markInvestigationApproved() (severity
 * HIGH/CRITICAL tanpa capa_id -> CAPA_IN_PROGRESS, selainnya -> RESOLVED
 * langsung). REJECTED -> kembali UNDER_INVESTIGATION.
 */
export declare class CustomerComplaintWorkflowCompletionListener {
    private readonly customerComplaintService;
    private readonly logger;
    constructor(customerComplaintService: CustomerComplaintService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
}
