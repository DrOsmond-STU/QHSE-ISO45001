import { Prisma, WorkflowApproverType } from "@prisma/client";
export interface ApproverResolutionStage {
    approverType: WorkflowApproverType;
    approverRoleId: string | null;
    approverUserId: string | null;
    allowDelegation?: boolean;
}
export declare class ApproverResolutionService {
    /**
     * Mengembalikan daftar user_id yang jadi assignee task untuk stage ini.
     * SPECIFIC_USER: satu user literal. ROLE_IN_SCOPE: seluruh user pemegang
     * approverRoleId — MASIH TENANT-WIDE SAJA sengaja, WALAU Modul 01/task 1.1
     * (hierarki organisasi + containment RBAC, lihat platform/rbac/scope-hierarchy.ts)
     * SUDAH ADA: mempersempit ke scope entity yang di-approve butuh tahu LOKASI
     * entity itu (site/department-nya) — signature method ini (`stage`,
     * `tenantId`) belum punya parameter itu, dan belum ada modul domain
     * konkret (Phase 3+, mis. Work Permit 3.3) yang benar-benar memanggil
     * startInstance()/actOnTask() dengan entity beralamat site/department utk
     * menentukan BENTUK parameter yang tepat — ditunda sampai ada pemanggil
     * nyata (bukan spekulasi bentuk API), bukan lupa. REPORTING_LINE: butuh
     * data reporting-line HRIS yang belum ada modulnya — throw eksplisit,
     * JANGAN pernah salah resolve diam-diam. CONTEXT_USER (task 2.1, DMS):
     * satu user id dibaca dari contextData.contextUserId — approver TERIKAT
     * ENTITAS yang sedang diproses (mis. document_versions Stage 1 "Document
     * Owner"), beda dari SPECIFIC_USER (fixed sama di semua instance) maupun
     * ROLE_IN_SCOPE (himpunan user via role, bukan satu user spesifik
     * mengikuti entitas).
     */
    resolveApprovers(tx: Prisma.TransactionClient, stage: ApproverResolutionStage, tenantId: string, contextData?: Record<string, unknown>): Promise<string[]>;
    private resolveNaturalApprovers;
    /**
     * Task 1.4 (Delegation of Authority) — persis seam yang dijanjikan
     * banner comment lama file ini: cek workflow_delegations dulu, baru
     * fallback ke hasil resolusi "natural" di atas. UNTUK SETIAP approver
     * hasil resolveNaturalApprovers(), cek apakah dia sedang punya
     * workflow_delegations AKTIF sbg delegator (roleId NULL = berlaku semua
     * role, ATAU cocok stage.approverRoleId) — kalau ya, substitusi dgn
     * delegate_user_id. Efeknya: workflow_tasks.assigned_to LANGSUNG jadi
     * delegate sejak task DIBUAT (createTasksForStage, WorkflowEngineService
     * 0.9) — NOL perubahan di WorkflowEngineService sama sekali (persis pola
     * yang sudah dijanjikan sejak 0.9). Task yang SUDAH PENDING sebelum
     * delegasi aktif TIDAK tersentuh method ini (rerouting-nya lewat job
     * delegation-scan terpisah, lihat user-role/delegation/).
     *
     * TIDAK mengejar rantai delegasi (kalau delegate juga sedang
     * didelegasikan ke orang lain) — PRD §4.3 tidak menyebut delegasi
     * berantai, dan mengejar rantai berisiko infinite loop kalau ada siklus
     * A->B->A (belum ada validasi anti-siklus di BR-07, beda dari
     * assertNoParentCycle department 1.1).
     */
    private substituteActiveDelegates;
}
