import { NotificationService } from "../../../../platform/notification/notification.service";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { WorkflowInstanceCompletedEvent } from "../../../../platform/workflow-engine/workflow-engine-events";
/**
 * Task 3.2 — KONSUMEN KETIGA WORKFLOW_INSTANCE_COMPLETED_EVENT (pola PERSIS
 * DocumentWorkflowCompletionListener 2.1/ComplianceEvaluationWorkflowCompletionListener
 * 2.2 — lihat banner comment 2.1 utk rationale race-condition lengkap,
 * TIDAK diulang di sini; payload event sendiri yang dipakai, TIDAK PERNAH
 * re-query workflow_instances/workflow_tasks). APPROVED (baik lewat 2
 * stage MAUPUN 3 stage percabangan EXTREME — listener ini TIDAK PEDULI
 * berapa stage yang dilalui, cuma peduli status FINAL instance) ->
 * IN_REVIEW->APPROVED->ACTIVE SATU TRANSAKSI (APPROVED TIDAK PERNAH
 * ditulis persisten, pola PERSIS DocumentVersionStatus APPROVED->PUBLISHED
 * 2.1). REJECTED -> IN_REVIEW->REQUIRES_REVISION (BUKAN DRAFT literal,
 * status TERSENDIRI yang FUNGSINYA "kembali ke siklus DRAFT" — lihat
 * banner comment hira-lifecycle.ts).
 */
export declare class HiraWorkflowCompletionListener {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
    private activate;
    private requireRevision;
}
