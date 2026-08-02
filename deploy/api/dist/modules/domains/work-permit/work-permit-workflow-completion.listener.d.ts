import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { WorkPermitApprovalCacheService } from "./work-permit-approval-cache.service";
/**
 * Task 3.3 — KONSUMEN KEENAM WORKFLOW_INSTANCE_COMPLETED_EVENT (pola PERSIS
 * listener HIRA/JSA/HIRADC 3.2/DMS 2.1/Compliance 2.2 — payload-only,
 * TIDAK PERNAH re-query workflow_instances/workflow_tasks, lihat banner
 * comment race-condition lengkap di DocumentWorkflowCompletionListener 2.1).
 * APPROVED (baik lewat 1 stage MAUPUN 2 stage percabangan BR-04 — listener
 * ini TIDAK PEDULI berapa stage yang dilalui) -> status=APPROVED (BUKAN
 * ACTIVE — aktivasi lapis TERPISAH via WorkPermitService.activate(), gated
 * BR-02/BR-03, PRD tidak menyebut auto-activate). REJECTED -> status=
 * REJECTED (TERMINAL — beda dari HIRA REQUIRES_REVISION/JSA-tetap-DRAFT,
 * work_permits TIDAK py status "kembali revisi" tersendiri di enum literal
 * PRD §5; teks PRD §4 poin 4 "Approve/Return ke Requester" utk Stage 1
 * genuinely bisa dibaca sbg loop-back DRAFT — interpretasi REJECTED
 * terminal dipilih supaya nilai enum itu genuinely reachable, didokumentasikan
 * ambigu di work-permit-lifecycle.ts, BUKAN disembunyikan). Me-refresh
 * work_permit_approvals (cache read-model, task 135) di KEDUA jalur.
 */
export declare class WorkPermitWorkflowCompletionListener {
    private readonly prisma;
    private readonly notificationService;
    private readonly approvalCacheService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService, approvalCacheService: WorkPermitApprovalCacheService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
    private markApproved;
    private markRejected;
}
