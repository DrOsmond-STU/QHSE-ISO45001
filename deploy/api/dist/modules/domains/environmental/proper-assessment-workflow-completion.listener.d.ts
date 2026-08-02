import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { ProperSelfAssessmentService } from "./proper-self-assessment.service";
/**
 * Task 5.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * proper_self_assessment (workflow ENV_PROPER_ASSESSMENT 2-stage). Payload-only,
 * pola PERSIS listener domain lain. APPROVED -> tutup workflow_instance_id
 * (submission_status sudah INTERNAL_REVIEWED sejak submit, lihat banner
 * comment ProperSelfAssessmentService). REJECTED -> kembali DRAFT.
 */
export declare class ProperAssessmentWorkflowCompletionListener {
    private readonly properSelfAssessmentService;
    private readonly logger;
    constructor(properSelfAssessmentService: ProperSelfAssessmentService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
}
