import { NotificationService } from "../../../../platform/notification/notification.service";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { WorkflowInstanceCompletedEvent } from "../../../../platform/workflow-engine/workflow-engine-events";
/**
 * Task 3.2 — KONSUMEN KELIMA WORKFLOW_INSTANCE_COMPLETED_EVENT. Workflow
 * instance APPROVED -> hiradc_records.status = VERIFIED (BUKAN APPROVED —
 * stage tunggalnya bernama "Verifikasi Supervisor", PRD §4.3 poin 2, jalur
 * workflow ini merealisasikan VERIFIKASI, bukan approval final; VERIFIED->APPROVED
 * lapis opsional terpisah lewat HiradcRecordService.approve(), TANPA
 * workflow tambahan). REJECTED -> status TETAP DRAFT, null-kan
 * workflowInstanceId supaya bisa diajukan verifikasi ulang (pola PERSIS
 * JsaWorkflowCompletionListener).
 */
export declare class HiradcWorkflowCompletionListener {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
    private markVerified;
    private resetForResubmission;
}
