import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { EnvironmentalAspectImpactService } from "./environmental-aspect-impact.service";
/**
 * Task 5.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * environmental_aspect_impact (workflow ENV_ASPECT_REVIEW 2-stage). Payload-only,
 * pola PERSIS NcrWorkflowCompletionListener 5.1. APPROVED -> UNDER_REVIEW->ACTIVE
 * (BR-01 ditegakkan di markApproved()). REJECTED -> kembali DRAFT.
 */
export declare class EnvironmentalAspectReviewWorkflowCompletionListener {
    private readonly aspectImpactService;
    private readonly logger;
    constructor(aspectImpactService: EnvironmentalAspectImpactService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
}
