import { Injectable } from "@nestjs/common";
import { CapaApprovalDecision } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./capa-context";

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
@Injectable()
export class CapaApprovalCacheService {
  constructor(private readonly prisma: PrismaService) {}

  async refresh(capaRegisterId: string, workflowInstanceId: string, approvalStage: string): Promise<void> {
    const tenantId = requireTenantId();

    await this.prisma.withRls(async (tx) => {
      const instance = await tx.workflowInstance.findUniqueOrThrow({ where: { id: workflowInstanceId } });
      const tasks = await tx.workflowTask.findMany({ where: { instanceId: instance.id }, orderBy: { createdAt: "asc" } });
      const actedTask = tasks.find((t) => t.status === "APPROVED" || t.status === "REJECTED");

      const decision: CapaApprovalDecision =
        instance.status === "APPROVED" ? "APPROVED" : instance.status === "REJECTED" ? "REJECTED" : "PENDING";

      const fallbackActor = tasks[0]?.assignedTo ?? requireActorUserId();

      await tx.capaApproval.upsert({
        where: { workflowInstanceId },
        create: {
          tenantId,
          capaRegisterId,
          approvalStage,
          workflowInstanceId,
          decision,
          decidedBy: actedTask?.actedBy ?? null,
          decidedAt: actedTask?.actedAt ?? null,
          comment: actedTask?.comment ?? null,
          createdBy: fallbackActor,
          updatedBy: fallbackActor,
        },
        update: {
          decision,
          decidedBy: actedTask?.actedBy ?? null,
          decidedAt: actedTask?.actedAt ?? null,
          comment: actedTask?.comment ?? null,
          updatedBy: fallbackActor,
        },
      });
    });
  }

  async listByCapa(capaRegisterId: string) {
    return this.prisma.withRls((tx) =>
      tx.capaApproval.findMany({ where: { capaRegisterId, deletedAt: null }, orderBy: { createdAt: "asc" } }),
    );
  }
}
