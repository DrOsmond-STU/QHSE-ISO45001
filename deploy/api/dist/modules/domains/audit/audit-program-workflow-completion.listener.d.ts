import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { AuditProgramService } from "./audit-program.service";
/**
 * Task 4.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * audit_program (pola PERSIS listener modul lain — payload-only, TIDAK
 * PERNAH re-query workflow_instances/workflow_tasks, lihat banner comment
 * WorkflowInstanceCompletedEvent). APPROVED -> AuditProgramService.
 * markApprovedActive() (status->APPROVED). REJECTED -> returnToDraft()
 * (status TETAP DRAFT, workflow_instance_id di-null-kan utk resubmission).
 *
 * TIDAK enqueue notifikasi di sini — PRD §8 baris "Program audit menunggu
 * approval" hanya utk SAAT SUBMIT (AuditProgramService.submitForApproval()
 * TIDAK mengirim notifikasi krn Workflow Engine 0.9 sendiri SUDAH membuat
 * workflow_tasks utk approver, yang jadi sumber "menunggu approval Anda"
 * via mekanisme task generik, bukan notification_templates modul ini) —
 * TIDAK ADA baris §8 "program disetujui/ditolak" sama sekali, gap TDD §26
 * konsisten Emergency Response 3.7.
 */
export declare class AuditProgramWorkflowCompletionListener {
    private readonly programService;
    private readonly logger;
    constructor(programService: AuditProgramService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
}
