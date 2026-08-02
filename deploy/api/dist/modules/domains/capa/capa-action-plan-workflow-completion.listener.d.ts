import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { CapaRegisterService } from "./capa-register.service";
/**
 * Task 4.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * capa_action_plan (pola PERSIS listener modul lain — payload-only, TIDAK
 * PERNAH re-query workflow_instances/workflow_tasks). APPROVED ->
 * CapaRegisterService.markActionPlanApproved() (status->IN_PROGRESS).
 * REJECTED -> returnToActionPlanDefined() (PIC redefine, workflow_
 * instance_id di-null-kan).
 *
 * TIDAK enqueue notifikasi di sini — PRD §8 baris "Action plan menunggu
 * approval" hanya utk SAAT SUBMIT (Workflow Engine 0.9 sendiri sudah
 * membuat workflow_tasks utk approver, pola sama Audit 4.1), TIDAK ADA
 * baris §8 "action plan disetujui/ditolak", gap TDD §26.
 */
export declare class CapaActionPlanWorkflowCompletionListener {
    private readonly registerService;
    private readonly logger;
    constructor(registerService: CapaRegisterService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
}
