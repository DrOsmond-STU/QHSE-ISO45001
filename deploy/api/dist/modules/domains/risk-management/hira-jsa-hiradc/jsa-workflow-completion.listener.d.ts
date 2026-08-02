import { NotificationService } from "../../../../platform/notification/notification.service";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { WorkflowInstanceCompletedEvent } from "../../../../platform/workflow-engine/workflow-engine-events";
/**
 * Task 3.2 — KONSUMEN KEEMPAT WORKFLOW_INSTANCE_COMPLETED_EVENT (pola
 * PERSIS listener lain modul ini/2.1/2.2). APPROVED -> DRAFT->APPROVED->ACTIVE
 * SATU TRANSAKSI (APPROVED tidak pernah persisten, sama pola HIRA/DMS).
 * REJECTED -> status TETAP DRAFT (tidak pernah "keluar" dari situ, lihat
 * banner comment jsa-lifecycle.ts) — cukup null-kan workflowInstanceId
 * (unique constraint TIDAK masalah diisi ulang instance BARU saat
 * disubmit lagi) supaya JsaRecordService.submitForApproval() bisa dipanggil
 * ulang, TIDAK ADA transisi status utk divalidasi di jalur ini.
 */
export declare class JsaWorkflowCompletionListener {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
    private activate;
    private resetForResubmission;
}
