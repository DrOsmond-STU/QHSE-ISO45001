import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * Task 3.3 — `work_permit_approvals` adalah CACHE/read-model (PRD §5
 * eksplisit "BUKAN pengganti Workflow Engine, sumber kebenaran tetap
 * workflow_instances/workflow_tasks"). `refresh()` membaca STATE SAAT INI
 * dari kedua tabel itu (bukan event-driven per-stage — `WorkflowEngineService`
 * 0.9 TIDAK emit event apa pun selain `WORKFLOW_INSTANCE_COMPLETED_EVENT`
 * saat TERMINAL, tidak ada hook "stage advanced") dan meng-upsert SATU
 * baris per permit. Dipanggil dari `WorkPermitService.submitForApproval()`
 * (baris awal, `finalDecision=PENDING`) + `WorkPermitService.actOnApprovalTask()`
 * (SETIAP approve/reject stage manapun, mid-flow MAUPUN terminal) +
 * `WorkPermitWorkflowCompletionListener` (jaring pengaman kalau caller
 * lupa refresh manual). SELAMA caller SELALU lewat `actOnApprovalTask()`
 * (BUKAN langsung `WorkflowEngineService.actOnTask()`), cache ini SELALU
 * segar — staleness HANYA muncul kalau ada pemanggil lain yang melewati
 * wrapper itu (mis. controller masa depan yang lupa memakainya) — gap
 * TDD §26.
 */
export declare class WorkPermitApprovalCacheService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    refresh(workPermitId: string): Promise<void>;
}
