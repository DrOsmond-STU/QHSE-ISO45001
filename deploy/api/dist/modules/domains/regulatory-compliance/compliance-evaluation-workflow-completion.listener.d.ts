import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
/**
 * Task 2.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT KEDUA (pola PERSIS
 * DocumentWorkflowCompletionListener, 2.1 — lihat banner comment file itu
 * utk rationale lengkap soal race condition emit()-sebelum-commit yang
 * SUDAH diverifikasi empiris di task 2.1, TIDAK diulang di sini). APPROVED
 * -> REVIEWED (menunggu close() eksplisit, BR-03 gate — lihat
 * ComplianceEvaluationService.close()). REJECTED -> DRAFT (BUKAN status
 * terminal terpisah — ComplianceEvaluationStatus tidak punya nilai
 * REJECTED sama sekali, beda dari DocumentVersionStatus 2.1) supaya
 * evaluator bisa revisi & submit ulang.
 */
export declare class ComplianceEvaluationWorkflowCompletionListener {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
    private markReviewed;
    private revertToDraft;
}
