import { Injectable, NotImplementedException } from "@nestjs/common";
import { Prisma, WorkflowApproverType } from "@prisma/client";

// Task 1.4 — resolveApprovers() sekarang wrap resolveNaturalApprovers()
// (logic 0.9 asli, tidak diubah) dengan substituteActiveDelegates()
// (cek workflow_delegations, lihat banner comment method itu) — persis
// seam yang dijanjikan sejak 0.9, TANPA menyentuh WorkflowEngineService.
export interface ApproverResolutionStage {
  approverType: WorkflowApproverType;
  approverRoleId: string | null;
  approverUserId: string | null;
  // Task 1.4 — WorkflowStage.allowDelegation (kolom sudah ada sejak 0.9,
  // default false). Opsional supaya caller lama yang mengonstruksi objek
  // sempit (mis. WorkflowSlaScanService reassignment ke role eskalasi)
  // TIDAK perlu diubah — undefined diperlakukan SAMA seperti false (fail
  // SAFE: default TIDAK ada substitusi delegasi, bukan default aktif).
  allowDelegation?: boolean;
}

@Injectable()
export class ApproverResolutionService {
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
  async resolveApprovers(
    tx: Prisma.TransactionClient,
    stage: ApproverResolutionStage,
    tenantId: string,
    contextData?: Record<string, unknown>,
  ): Promise<string[]> {
    const naturalApproverIds = await this.resolveNaturalApprovers(tx, stage, tenantId, contextData);
    if (!stage.allowDelegation) {
      return naturalApproverIds;
    }
    return this.substituteActiveDelegates(tx, naturalApproverIds, stage.approverRoleId, tenantId);
  }

  private async resolveNaturalApprovers(
    tx: Prisma.TransactionClient,
    stage: ApproverResolutionStage,
    tenantId: string,
    contextData?: Record<string, unknown>,
  ): Promise<string[]> {
    switch (stage.approverType) {
      case "SPECIFIC_USER": {
        if (!stage.approverUserId) {
          throw new Error("workflow_stages.approver_user_id kosong untuk approverType SPECIFIC_USER.");
        }
        return [stage.approverUserId];
      }
      case "ROLE_IN_SCOPE": {
        if (!stage.approverRoleId) {
          throw new Error("workflow_stages.approver_role_id kosong untuk approverType ROLE_IN_SCOPE.");
        }
        const today = new Date();
        const assignments = await tx.userRole.findMany({
          where: {
            tenantId,
            roleId: stage.approverRoleId,
            status: "ACTIVE",
            validFrom: { lte: today },
            OR: [{ validTo: null }, { validTo: { gte: today } }],
          },
          select: { userId: true },
        });
        return [...new Set(assignments.map((a) => a.userId))];
      }
      case "REPORTING_LINE": {
        throw new NotImplementedException(
          "approverType REPORTING_LINE belum didukung — menunggu data reporting-line HRIS (modul masa depan).",
        );
      }
      case "CONTEXT_USER": {
        const contextUserId = contextData?.contextUserId;
        if (typeof contextUserId !== "string" || contextUserId.length === 0) {
          throw new Error(
            "workflow_instances.context_data.contextUserId kosong/bukan string untuk approverType CONTEXT_USER — caller startInstance() wajib mengisinya.",
          );
        }
        return [contextUserId];
      }
    }
  }

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
  private async substituteActiveDelegates(
    tx: Prisma.TransactionClient,
    userIds: string[],
    stageApproverRoleId: string | null,
    tenantId: string,
  ): Promise<string[]> {
    if (userIds.length === 0) return userIds;
    const today = new Date();
    const delegations = await tx.workflowDelegation.findMany({
      where: {
        tenantId,
        delegatorUserId: { in: userIds },
        isActive: true,
        dateFrom: { lte: today },
        dateTo: { gte: today },
        ...(stageApproverRoleId ? { OR: [{ roleId: null }, { roleId: stageApproverRoleId }] } : { roleId: null }),
      },
      select: { delegatorUserId: true, delegateUserId: true },
    });

    const substitutionMap = new Map(delegations.map((d) => [d.delegatorUserId, d.delegateUserId]));
    const substituted = userIds.map((id) => substitutionMap.get(id) ?? id);
    return [...new Set(substituted)];
  }
}
