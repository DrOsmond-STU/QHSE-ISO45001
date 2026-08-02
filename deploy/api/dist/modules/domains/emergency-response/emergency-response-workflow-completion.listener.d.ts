import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { EmergencyResponsePlanService } from "./emergency-response-plan.service";
/**
 * Task 3.7 — KESEMBILAN KONSUMEN WORKFLOW_INSTANCE_COMPLETED_EVENT (pola
 * PERSIS listener modul lain — payload-only, TIDAK PERNAH re-query
 * workflow_instances/workflow_tasks, lihat banner comment
 * WorkflowInstanceCompletedEvent). APPROVED -> EmergencyResponsePlanService.markApprovedActive()
 * (status->APPROVED_ACTIVE + next_review_due_date dihitung BR-01). REJECTED
 * -> returnToDraft() (status->DRAFT, workflow_instance_id di-null-kan utk
 * resubmission, pola sama JSA 3.2).
 *
 * BEDA dari precedent: modul ini TIDAK enqueue notifikasi apa pun di sini —
 * PRD §8 tabel notifikasi Modul 14 TIDAK menyebutkan event "plan
 * disetujui/ditolak" sama sekali (5 baris §8 semuanya soal aktivasi/review-
 * overdue/drill/equipment, TIDAK ada baris "plan approved/rejected"), gap
 * TDD §26 — beda dari Incident/Work Permit yang PRD-nya eksplisit minta
 * notifikasi approval.
 */
export declare class EmergencyResponseWorkflowCompletionListener {
    private readonly prisma;
    private readonly planService;
    private readonly logger;
    constructor(prisma: PrismaService, planService: EmergencyResponsePlanService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
}
