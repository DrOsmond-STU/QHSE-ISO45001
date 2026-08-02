import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * Task 4.2 — `capa_approvals` adalah CACHE/read-model (PRD §5 eksplisit
 * "Sumber kebenaran tetap workflow_instances/workflow_tasks", pola PERSIS
 * `work_permit_approvals` 3.3) — TAPI BEDA BENTUK: `work_permit_approvals`
 * SATU baris tetap per permit (kolom bernama per-stage tetap, krn selalu
 * tepat 2 stage); `capa_approvals` **1..N baris PER capa_register (SATU
 * baris per workflow_instance)** krn PRD §5 ERD literal sendiri bilang
 * "1..N capa_approvals (cache tiap stage)" — CAPA py DUA workflow process
 * TERPISAH (capa_action_plan, capa_effectiveness_verification) yang bisa
 * masing2 disubmit ULANG (reject->resubmit) sepanjang siklus hidup CAPA,
 * jadi upsert dilakukan per `workflowInstanceId` (`@unique`), BUKAN per
 * `capaRegisterId`.
 */
export declare class CapaApprovalCacheService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    refresh(capaRegisterId: string, workflowInstanceId: string, approvalStage: string): Promise<void>;
    listByCapa(capaRegisterId: string): Promise<{
        id: string;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        deletedAt: Date | null;
        comment: string | null;
        workflowInstanceId: string;
        capaRegisterId: string;
        approvalStage: string;
        decision: import("@prisma/client").$Enums.CapaApprovalDecision;
        decidedBy: string | null;
        decidedAt: Date | null;
    }[]>;
}
