import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { NcrRecordService } from "./ncr-record.service";
/**
 * Task 5.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * ncr_record. Payload-only (TIDAK re-query ncr_records — tidak ada data
 * tambahan yang dibutuhkan selain payload.entityId/status sendiri, pola
 * PERSIS CapaActionPlanWorkflowCompletionListener 4.2). APPROVED (SELURUH
 * 3 stage: Review Supervisor->Approval Disposisi Quality Manager->
 * Verifikasi Penutupan) -> DISPOSITION_PENDING->DISPOSITIONED. REJECTED
 * (di stage manapun) -> kembali CONTAINMENT (disposisi diajukan ulang).
 */
export declare class NcrWorkflowCompletionListener {
    private readonly ncrRecordService;
    private readonly logger;
    constructor(ncrRecordService: NcrRecordService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
}
