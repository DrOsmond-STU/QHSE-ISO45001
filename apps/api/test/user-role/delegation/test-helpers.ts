import { randomUUID } from "node:crypto";
import { adminPrisma } from "../../auth/test-helpers";

export { adminPrisma, createTestApp, seedTenantFixture } from "../../auth/test-helpers";
export { seedUserInTenant } from "../../workflow-engine/test-helpers";
export type { TenantFixture } from "../../auth/test-helpers";

export interface SingleStageWorkflowFixture {
  workflowDefinitionId: string;
  stageId: string;
  approverRoleId: string | null;
}

/**
 * 1 stage, SPECIFIC_USER atau ROLE_IN_SCOPE, transisi APPROVE -> terminal
 * APPROVED (supaya actOnTask() bisa dipanggil sungguhan sampai selesai,
 * bukan cuma cek kolom workflow_tasks). allowDelegation dikontrol caller
 * (task 1.4 — default false di skema, test yang butuh substitusi delegasi
 * WAJIB set true eksplisit).
 */
export async function seedSingleStageWorkflowDefinition(
  tenantId: string,
  options: { approverUserId?: string; approverRoleId?: string; allowDelegation: boolean },
): Promise<SingleStageWorkflowFixture> {
  const definition = await adminPrisma.workflowDefinition.create({
    data: { tenantId, moduleCode: "TEST_DELEGATION", name: "Delegation Test Workflow" },
  });

  const stage = await adminPrisma.workflowStage.create({
    data: {
      tenantId,
      workflowDefinitionId: definition.id,
      sequenceNo: 1,
      stageName: "Stage 1",
      approverType: options.approverRoleId ? "ROLE_IN_SCOPE" : "SPECIFIC_USER",
      approverUserId: options.approverUserId,
      approverRoleId: options.approverRoleId,
      allowDelegation: options.allowDelegation,
      slaHours: 24,
      escalationAction: "NONE",
    },
  });

  await adminPrisma.workflowTransition.create({
    data: {
      tenantId,
      workflowDefinitionId: definition.id,
      fromStageId: stage.id,
      toStageId: null,
      triggerAction: "APPROVE",
      condition: undefined,
      priority: 0,
      resultStatus: "APPROVED",
    },
  });

  return { workflowDefinitionId: definition.id, stageId: stage.id, approverRoleId: options.approverRoleId ?? null };
}

export function isoDate(daysFromToday: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export const randomTestUuid = randomUUID;
