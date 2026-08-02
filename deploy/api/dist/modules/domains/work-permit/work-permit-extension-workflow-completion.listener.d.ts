import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
/**
 * Task 3.4 — KONSUMEN KETUJUH WORKFLOW_INSTANCE_COMPLETED_EVENT (pola
 * PERSIS listener lain modul ini/3.2/2.1/2.2 — payload-only, TIDAK PERNAH
 * re-query workflow_instances/workflow_tasks). APPROVED ->
 * work_permit_extensions.status=APPROVED, work_permits.plannedEndDatetime
 * DIPERBARUI ke requestedNewEndDatetime, status EXTENSION_REQUESTED->ACTIVE.
 * REJECTED -> work_permit_extensions.status=REJECTED, work_permits.status
 * EXTENSION_REQUESTED->ACTIVE TANPA mengubah plannedEndDatetime (extension
 * ditolak, jadwal asli tetap berlaku — permit bisa segera EXPIRED kalau
 * planned_end_datetime asli sudah/segera terlampaui, work-permit-expiry-scan
 * yang akan menangkapnya pada scan berikutnya).
 */
export declare class WorkPermitExtensionWorkflowCompletionListener {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
    private markApproved;
    private markRejected;
}
